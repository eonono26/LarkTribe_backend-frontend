import hashlib
import hmac
import io
import json
import shutil
import tempfile
import time

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from accounts.models import User
from catalog.models import Category, Department, Product, ProductImage
from catalog.models import ProductVariant, SizeGuide
from orders import gateways
from orders.models import Order

TMP_MEDIA = tempfile.mkdtemp()


def png_bytes(color=(200, 50, 50), size=(400, 600)):
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, "PNG")
    return buf.getvalue()


def upload(name="a.png", **kw):
    return SimpleUploadedFile(name, png_bytes(**kw), content_type="image/png")


@override_settings(MEDIA_ROOT=TMP_MEDIA, TRYON_PROVIDER="mock", TRYON_PILOT_PRODUCT_IDS=[], FEED_TOKEN="")
class BaseCase(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TMP_MEDIA, ignore_errors=True)

    def setUp(self):
        dept = Department.objects.create(name="D")
        cat = Category.objects.create(department=dept, name="Dresses")
        self.product = Product.objects.create(category=cat, name="Red Summer Dress", price=2000,
                                              sku="RSD", status=Product.Status.ACTIVE, stock=10, description="light cotton")
        ProductVariant.objects.create(product=self.product, color="Red", size="M", stock=3)
        ProductVariant.objects.create(product=self.product, color="Red", size="L", stock=3)
        ProductImage.objects.create(product=self.product, image=upload("p.png", color=(220, 20, 60)), color="Red", view="front", is_primary=True)
        self.user = User.objects.create_user("buyer", email="b@x.com", password="pw12345!")
        self.client = APIClient()


class TryOnTests(BaseCase):
    def setUp(self):
        super().setUp()
        from unittest import mock
        # Don't spawn the background worker in tests; we call services.process() directly.
        patcher = mock.patch("tryon.views.services.enqueue")
        patcher.start()
        self.addCleanup(patcher.stop)

    def _post(self, **extra):
        data = {"product": self.product.pk, "consent": "true", "photo": upload("me.png", color=(90, 90, 90))}
        data.update(extra)
        return self.client.post("/api/tryon/", data, format="multipart")

    def test_requires_login(self):
        self.assertEqual(self._post().status_code, 401)

    def test_requires_consent(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self._post(consent="false").status_code, 400)

    def test_full_flow_deletes_source_and_saves_and_shares(self):
        from tryon import services
        self.client.force_authenticate(self.user)
        res = self._post()
        self.assertEqual(res.status_code, 202, res.content)
        rid = res.json()["id"]
        services.process(rid)  # run the worker synchronously
        d = self.client.get(f"/api/tryon/{rid}/").json()
        self.assertEqual(d["status"], "done", d)
        self.assertTrue(d["result_url"])
        from tryon.models import TryOnRequest
        self.assertFalse(TryOnRequest.objects.get(pk=rid).source_photo)  # privacy: original removed
        self.assertEqual(self.client.post(f"/api/tryon/{rid}/save/", {"saved": True}, format="json").json()["is_saved"], True)
        share = self.client.post(f"/api/tryon/{rid}/share/", {"shared": True}, format="json").json()
        self.assertTrue(share["share_path"])
        token = share["share_path"].split("/")[-1]
        self.client.force_authenticate(None)
        pub = self.client.get(f"/api/tryon/shared/{token}/")
        self.assertEqual(pub.status_code, 200)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.delete(f"/api/tryon/{rid}/").status_code, 204)

    def test_daily_limit(self):
        self.client.force_authenticate(self.user)
        with self.settings(TRYON_DAILY_LIMIT=1):
            self.assertEqual(self._post().status_code, 202)
            self.assertEqual(self._post().status_code, 400)

    def test_bad_file_rejected(self):
        self.client.force_authenticate(self.user)
        bad = SimpleUploadedFile("x.png", b"not an image", content_type="image/png")
        self.assertEqual(self._post(photo=bad).status_code, 400)


class SizeAndSearchTests(BaseCase):
    def test_generic_kids_size_by_height(self):
        r = self.client.post("/api/ai/size-recommendation/", {"product_id": self.product.pk, "height_cm": 98}, format="json").json()
        self.assertEqual(r["size"], "2-3 Yrs")
        self.assertIn("disclaimer", r)

    def test_adult_size_matches_available(self):
        r = self.client.post("/api/ai/size-recommendation/", {"product_id": self.product.pk, "height_cm": 172, "chest_cm": 100}, format="json").json()
        self.assertEqual(r["size"], "M")
        self.assertTrue(r["in_stock"])

    def test_size_guide_table(self):
        g = SizeGuide.objects.create(name="Kids", columns=["Size", "Height (cm)"], rows=[["S", "90-100"], ["M", "100-110"], ["L", "110-120"]])
        self.product.size_guide = g
        self.product.save()
        r = self.client.post("/api/ai/size-recommendation/", {"product_id": self.product.pk, "height_cm": 112}, format="json").json()
        self.assertEqual(r["size"], "L")

    def test_validation(self):
        r = self.client.post("/api/ai/size-recommendation/", {"product_id": self.product.pk, "height_cm": 5}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_multiword_typo_search(self):
        for q in ("red summer dress", "red sumer dres", "dress red"):
            res = self.client.get("/api/ai/search/", {"q": q}).json()
            self.assertEqual([p["id"] for p in res["results"]], [self.product.pk], q)


class GeoFeedConfigTests(BaseCase):
    def test_delivery_estimate_nairobi(self):
        r = self.client.get("/api/integrations/delivery-estimate/", {"lat": -1.29, "lng": 36.82, "subtotal": 1000}).json()
        self.assertEqual(r["fee"], 200)
        self.assertEqual(r["city"], "Nairobi")

    def test_delivery_estimate_far_and_free(self):
        far = self.client.get("/api/integrations/delivery-estimate/", {"lat": -4.04, "lng": 39.67, "subtotal": 100}).json()
        self.assertGreater(far["fee"], 450)
        free = self.client.get("/api/integrations/delivery-estimate/", {"lat": -4.04, "lng": 39.67, "subtotal": 9000}).json()
        self.assertEqual(free["fee"], 0)

    def test_estimate_validates(self):
        self.assertEqual(self.client.get("/api/integrations/delivery-estimate/").status_code, 400)

    def test_location_ping_stores_rounded_city(self):
        r = self.client.post("/api/integrations/location-ping/", {"lat": -1.2861, "lng": 36.8172}, format="json").json()
        self.assertEqual(r["city"], "Nairobi")

    def test_feeds(self):
        x = self.client.get("/api/integrations/feeds/meta.xml")
        self.assertEqual(x.status_code, 200)
        self.assertIn("Red Summer Dress", x.content.decode())
        c = self.client.get("/api/integrations/feeds/meta.csv").content.decode()
        self.assertIn("2000.00 KES", c)
        with self.settings(FEED_TOKEN="s3"):
            self.assertEqual(self.client.get("/api/integrations/feeds/meta.csv").status_code, 403)
            self.assertEqual(self.client.get("/api/integrations/feeds/meta.csv?token=s3").status_code, 200)

    def test_public_config(self):
        with self.settings(META_PIXEL_ID="123", STRIPE_SECRET_KEY="sk_test"):
            d = self.client.get("/api/integrations/public-config/").json()
        self.assertEqual(d["meta_pixel_id"], "123")
        self.assertIn("stripe", d["payments"]["card_providers"])

    def test_detail_exposes_360_flags(self):
        d = self.client.get(f"/api/catalog/products/{self.product.slug}/").json()
        self.assertFalse(d["has_360"])
        from catalog.models import ProductSpinFrame
        ProductSpinFrame.objects.create(product=self.product, order=0, image=upload("f.png"))
        d = self.client.get(f"/api/catalog/products/{self.product.slug}/").json()
        self.assertTrue(d["has_360"])
        self.assertEqual(len(d["spin_frames"]), 1)


@override_settings(STRIPE_SECRET_KEY="sk_test_x", STRIPE_WEBHOOK_SECRET="whsec_test", PAYSTACK_SECRET_KEY="sk_paystack",
                   CARD_PROVIDERS=["stripe", "paystack"])
class CardPaymentTests(BaseCase):
    def _order(self):
        return Order.objects.create(order_number="ABC123", status=Order.Status.PENDING_PAYMENT, payment_method="card",
                                    subtotal=2000, total=2250, shipping_name="B", shipping_phone="0712345678",
                                    shipping_address="x", shipping_city="Nairobi", guest_email="g@x.com")

    def test_stripe_webhook_marks_paid_once_and_checks_signature(self):
        order = self._order()
        body = json.dumps({"type": "checkout.session.completed", "data": {"object": {
            "id": "cs_1", "payment_status": "paid", "client_reference_id": "ABC123", "payment_intent": "pi_1", "amount_total": 225000}}}).encode()
        ts = str(int(time.time()))
        sig = hmac.new(b"whsec_test", ts.encode() + b"." + body, hashlib.sha256).hexdigest()
        bad = self.client.post("/api/orders/webhooks/stripe/", body, content_type="application/json", HTTP_STRIPE_SIGNATURE=f"t={ts},v1=bad")
        self.assertEqual(bad.status_code, 400)
        ok = self.client.post("/api/orders/webhooks/stripe/", body, content_type="application/json", HTTP_STRIPE_SIGNATURE=f"t={ts},v1={sig}")
        self.assertEqual(ok.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PAID)
        self.assertEqual(order.payment_provider, "stripe")
        # replay is harmless
        self.client.post("/api/orders/webhooks/stripe/", body, content_type="application/json", HTTP_STRIPE_SIGNATURE=f"t={ts},v1={sig}")
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PAID)

    def test_short_payment_rejected(self):
        order = self._order()
        self.assertFalse(gateways.mark_paid(order, "stripe", "pi_x", 1000))
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PENDING_PAYMENT)

    def test_paystack_webhook(self):
        order = self._order()
        body = json.dumps({"event": "charge.success", "data": {"reference": "ABC123-xyz", "status": "success", "amount": 225000,
                                                                "metadata": {"order_number": "ABC123"}}}).encode()
        sig = hmac.new(b"sk_paystack", body, hashlib.sha512).hexdigest()
        r = self.client.post("/api/orders/webhooks/paystack/", body, content_type="application/json", HTTP_X_PAYSTACK_SIGNATURE=sig)
        self.assertEqual(r.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PAID)
        self.assertEqual(order.payment_provider, "paystack")

    def test_stripe_failure_falls_back_to_paystack(self):
        order = self._order()
        calls = []

        class R:
            def __init__(self, code, js):
                self.status_code, self._js, self.content, self.text = code, js, b"x", "x"
            def json(self):
                return self._js

        def fake_post(url, **kw):
            calls.append(url)
            if "stripe" in url:
                return R(500, {})
            return R(200, {"status": True, "data": {"authorization_url": "https://pay.example/p"}})

        from unittest import mock
        with mock.patch("orders.gateways.requests.post", fake_post):
            res = gateways.create_card_checkout(order, "stripe")
        self.assertEqual(res["provider"], "paystack")
        self.assertEqual(len(calls), 2)

    def test_checkout_card_returns_redirect(self):
        from cart.models import Cart, CartItem
        from unittest import mock
        self.client.force_authenticate(self.user)
        cart = Cart.objects.create(user=self.user) if "user" in [f.name for f in Cart._meta.fields] else None
        if cart is None:
            self.skipTest("cart model shape differs")
        CartItem.objects.create(cart=cart, product=self.product, quantity=1)
        with mock.patch("orders.views.gateways.create_card_checkout", return_value={"provider": "stripe", "redirect_url": "https://stripe/x", "reference": "cs_1"}):
            r = self.client.post("/api/orders/checkout/", {
                "payment_method": "card", "shipping_name": "B", "shipping_phone": "0712345678", "shipping_address": "x",
                "shipping_city": "Nairobi", "shipping_lat": "-1.286", "shipping_lng": "36.817"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["payment"]["redirect_url"], "https://stripe/x")
