import io
import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from accounts.models import User
from vendors.models import Vendor

from .models import Category, Department, Product, ProductImage, ProductVariant

TMP_MEDIA = tempfile.mkdtemp()


def png(name="x.png"):
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), "red").save(buf, "PNG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/png")


@override_settings(MEDIA_ROOT=TMP_MEDIA)
class ColorGalleryTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TMP_MEDIA, ignore_errors=True)

    def setUp(self):
        self.user = User.objects.create_user("vendor1", password="pw12345!", role="vendor")
        self.vendor = Vendor.objects.create(
            user=self.user, store_name="Test Store", slug="test-store", status="approved"
        )
        dept = Department.objects.create(name="Test Dept")
        cat = Category.objects.create(department=dept, name="Test Dresses")
        self.product = Product.objects.create(
            vendor=self.vendor, category=cat, name="Linen Dress", price=1000,
            sku="LD-1", status=Product.Status.ACTIVE, stock=10,
        )
        for color in ("Black", "Blue"):
            for size in ("S", "M"):
                ProductVariant.objects.create(product=self.product, color=color, size=size, stock=3)

    def img(self, color, view, order, primary=False):
        return ProductImage.objects.create(
            product=self.product, image=png(), color=color, view=view,
            order=order, is_primary=primary,
        )

    # ---------------- model rules ----------------

    def test_first_photo_of_a_color_becomes_primary(self):
        a = self.img("Black", "front", 0)
        b = self.img("Black", "back", 1)
        c = self.img("Blue", "front", 0)
        for i in (a, b, c):
            i.refresh_from_db()
        self.assertTrue(a.is_primary)
        self.assertFalse(b.is_primary)
        self.assertTrue(c.is_primary)  # primaries are per color

    def test_marking_a_new_primary_demotes_the_old_one_only_in_that_color(self):
        a = self.img("Black", "front", 0)
        b = self.img("Black", "back", 1)
        blue = self.img("Blue", "front", 0)
        b.is_primary = True
        b.save()
        a.refresh_from_db(); blue.refresh_from_db()
        self.assertFalse(a.is_primary)
        self.assertTrue(blue.is_primary)

    def test_color_match_is_case_insensitive(self):
        a = self.img("Black", "front", 0)
        b = self.img("black", "back", 1)
        a.refresh_from_db(); b.refresh_from_db()
        self.assertTrue(a.is_primary)
        self.assertFalse(b.is_primary)

    def test_db_constraint_blocks_two_primaries_in_a_color(self):
        self.img("Black", "front", 0)
        with self.assertRaises(IntegrityError), transaction.atomic():
            ProductImage.objects.filter(product=self.product).update(is_primary=True)
            ProductImage.objects.bulk_create(
                [ProductImage(product=self.product, image="x.png", color="Black", is_primary=True)]
            )

    def test_deleting_the_primary_promotes_the_next_photo(self):
        a = self.img("Black", "front", 0)
        b = self.img("Black", "back", 1)
        a.delete()
        b.refresh_from_db()
        self.assertTrue(b.is_primary)

    def test_moving_the_primary_to_another_color_repairs_the_old_color(self):
        a = self.img("Black", "front", 0)
        b = self.img("Black", "back", 1)
        a.color = "Blue"
        a.save()
        b.refresh_from_db()
        self.assertTrue(b.is_primary)

    # ---------------- API output ----------------

    def _detail(self):
        res = APIClient().get(f"/api/catalog/products/{self.product.slug}/")
        self.assertEqual(res.status_code, 200, res.content)
        return res.json()

    def test_detail_returns_ordered_gallery_per_color(self):
        # created out of display order on purpose
        self.img("Black", "side", 2)
        self.img("Black", "back", 1)
        self.img("Black", "front", 0, primary=True)
        self.img("Black", "detail", 3)
        self.img("Blue", "front", 0)
        self.img("Blue", "back", 1)

        data = self._detail()
        galleries = {g["color"]: g for g in data["color_galleries"]}

        self.assertEqual([g["color"] for g in data["color_galleries"]], ["Black", "Blue"])
        black = galleries["Black"]
        self.assertEqual([i["view"] for i in black["images"]], ["front", "back", "side", "detail"])
        self.assertEqual([i["order"] for i in black["images"]], [0, 1, 2, 3])
        self.assertEqual(black["primary_image"]["view"], "front")
        self.assertTrue(black["primary_image"]["is_primary"])
        self.assertEqual({i["color"] for i in black["images"]}, {"Black"})
        self.assertEqual([i["view"] for i in galleries["Blue"]["images"]], ["front", "back"])
        self.assertTrue(black["images"][0]["image"].startswith("http"))

    def test_primary_is_listed_first_even_with_a_higher_order(self):
        self.img("Black", "back", 0)
        self.img("Black", "front", 5, primary=True)
        black = self._detail()["color_galleries"][0]
        self.assertEqual([i["view"] for i in black["images"]], ["front", "back"])

    def test_color_without_photos_is_listed_with_empty_gallery_and_general_shots_separate(self):
        self.img("Black", "front", 0)
        self.img("", "front", 0)
        data = self._detail()
        by_color = {g["color"]: g for g in data["color_galleries"]}
        self.assertEqual(by_color["Blue"]["images"], [])
        self.assertIsNone(by_color["Blue"]["primary_image"])
        self.assertEqual(len(by_color[""]["images"]), 1)

    def test_flat_images_carry_new_fields(self):
        self.img("Black", "front", 0)
        first = self._detail()["images"][0]
        for key in ("id", "image", "alt_text", "color", "view", "view_display", "is_primary", "order"):
            self.assertIn(key, first)

    def test_list_color_images_uses_primary_photo(self):
        self.img("Black", "back", 0)
        front = self.img("Black", "front", 1, primary=True)
        res = APIClient().get("/api/catalog/products/")
        self.assertEqual(res.status_code, 200)
        results = res.json().get("results", res.json())
        item = next(p for p in results if p["id"] == self.product.id)
        self.assertTrue(item["color_images"]["Black"].endswith(front.image.url))

    def test_existing_product_variant_stock_fields_unchanged(self):
        data = self._detail()
        self.assertEqual(len(data["variants"]), 4)
        self.assertEqual(set(data["variants"][0]), {"id", "size", "color", "stock", "sku_suffix"})
        self.assertEqual(data["available_sizes"], ["S", "M"])
        self.assertTrue(data["is_in_stock"])

    # ---------------- vendor upload ----------------

    def test_vendor_upload_with_color_view_order_and_primary(self):
        c = APIClient()
        c.force_authenticate(self.user)
        url = f"/api/catalog/my-products/{self.product.id}/images/"

        r1 = c.post(url, {"image": png("a.png"), "color": "Black", "view": "front"}, format="multipart")
        r2 = c.post(url, {"image": png("b.png"), "color": "Black", "view": "back"}, format="multipart")
        self.assertEqual(r1.status_code, 201, r1.content)
        self.assertEqual(r1.json()["color"], "Black")
        self.assertTrue(r1.json()["is_primary"])      # first of its color
        self.assertEqual(r2.json()["order"], 1)       # appended to the color's gallery
        self.assertFalse(r2.json()["is_primary"])

        r3 = c.post(url, {"image": png("c.png"), "color": "Black", "view": "side", "is_primary": "true"}, format="multipart")
        self.assertTrue(r3.json()["is_primary"])
        self.assertEqual(r3.json()["order"], 0)
        gallery = [g for g in self._detail()["color_galleries"] if g["color"] == "Black"][0]
        self.assertEqual([i["view"] for i in gallery["images"]], ["side", "front", "back"])

    def test_vendor_upload_rejects_unknown_view(self):
        c = APIClient()
        c.force_authenticate(self.user)
        r = c.post(f"/api/catalog/my-products/{self.product.id}/images/",
                   {"image": png(), "view": "inside-out"}, format="multipart")
        self.assertEqual(r.status_code, 400)

    def test_vendor_set_primary_is_scoped_to_one_color(self):
        a = self.img("Black", "front", 0)
        b = self.img("Black", "back", 1)
        blue = self.img("Blue", "front", 0)
        blue2 = self.img("Blue", "back", 1)
        c = APIClient()
        c.force_authenticate(self.user)
        r = c.post(f"/api/catalog/my-products/{self.product.id}/images/{b.id}/set-primary/")
        self.assertEqual(r.status_code, 200)
        for i in (a, b, blue, blue2):
            i.refresh_from_db()
        self.assertTrue(b.is_primary and b.order == 0)
        self.assertEqual(a.order, 1)
        self.assertEqual((blue.order, blue2.order), (0, 1))  # other color untouched
        self.assertTrue(blue.is_primary)

    # ---------------- admin panel API ----------------

    def test_admin_panel_upload_patch_and_set_primary(self):
        admin = User.objects.create_user("boss", password="pw12345!", role="admin", is_staff=True, is_superuser=True)
        c = APIClient()
        c.force_authenticate(admin)
        base = f"/api/admin-panel/products/{self.product.id}/images/"
        res = c.post(base, {"image": png(), "color": "Blue", "view": "front"}, format="multipart")
        self.assertEqual(res.status_code, 201, res.content)
        res = c.post(base, {"image": png(), "color": "Blue", "view": "detail"}, format="multipart")
        imgs = res.json()
        self.assertEqual([(i["view"], i["is_primary"]) for i in imgs], [("front", True), ("detail", False)])

        detail_id = imgs[1]["id"]
        res = c.patch(f"{base}{detail_id}/", {"view": "back", "order": 1, "is_primary": True}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        by_id = {i["id"]: i for i in res.json()}
        self.assertEqual(by_id[detail_id]["view"], "back")
        self.assertTrue(by_id[detail_id]["is_primary"])
        self.assertEqual(sum(i["is_primary"] for i in res.json()), 1)

        res = c.patch(f"{base}{detail_id}/", {"view": "bogus"}, format="json")
        self.assertEqual(res.status_code, 400)


@override_settings(MEDIA_ROOT=TMP_MEDIA)
class ProductAdminPhotoTests(ColorGalleryTests):
    """Django admin: the per-colour photo experience."""

    def setUp(self):
        super().setUp()
        self.su = User.objects.create_superuser("root", "r@x.com", "pw12345!")
        self.client.force_login(self.su)

    def test_change_page_renders_gallery_overview_with_warnings(self):
        self.img("Black", "back", 0)  # no front, and Blue has nothing
        res = self.client.get(f"/admin/catalog/product/{self.product.id}/change/")
        self.assertEqual(res.status_code, 200)
        html = res.content.decode()
        self.assertIn("Gallery overview", html)
        self.assertIn("no Front view", html)
        self.assertIn("no photos yet", html)
        self.assertIn("one gallery per colour", html)

    def _formset(self, rows, existing=0):
        from django.contrib import admin as dj_admin
        from django.test import RequestFactory
        from .admin import ProductImageInline
        req = RequestFactory().get("/")
        req.user = self.su
        FS = ProductImageInline(Product, dj_admin.site).get_formset(req, self.product)
        prefix = FS.get_default_prefix()
        data = {f"{prefix}-TOTAL_FORMS": len(rows), f"{prefix}-INITIAL_FORMS": existing,
                f"{prefix}-MIN_NUM_FORMS": 0, f"{prefix}-MAX_NUM_FORMS": 1000}
        files = {}
        for n, r in enumerate(rows):
            data[f"{prefix}-{n}-color"] = r.get("color", "")
            data[f"{prefix}-{n}-view"] = r.get("view", "front")
            if r.get("is_primary"):
                data[f"{prefix}-{n}-is_primary"] = "on"
            files[f"{prefix}-{n}-image"] = png(f"n{n}.png")
        return FS(data, files, instance=self.product)

    def test_blank_order_and_alt_text_are_filled_in(self):
        self.img("Black", "front", 0)
        self.img("Black", "back", 1)
        fs = self._formset([{"color": "Black", "view": "side"}])
        self.assertTrue(fs.is_valid(), fs.errors)
        fs.save()
        new = ProductImage.objects.filter(product=self.product, view="side").get()
        self.assertEqual(new.order, 2)                       # appended to Black's gallery
        self.assertEqual(new.alt_text, "Linen Dress - Black - Side")
        self.assertFalse(new.is_primary)

    def test_two_primaries_in_one_colour_are_rejected_but_two_colours_are_fine(self):
        fs = self._formset([{"color": "Black", "is_primary": True}, {"color": "Black", "is_primary": True}])
        self.assertFalse(fs.is_valid())
        self.assertIn("Only one photo can be Primary per colour", str(fs.non_form_errors()))
        ok = self._formset([{"color": "Black", "is_primary": True}, {"color": "Blue", "is_primary": True}])
        self.assertTrue(ok.is_valid(), ok.errors)

    def test_legacy_colour_without_variant_stays_selectable(self):
        img = self.img("Teal", "front", 0)
        from .admin import ProductImageForm
        form = ProductImageForm(instance=img)
        self.assertIn("Teal", [c[0] for c in form.fields["color"].choices])
