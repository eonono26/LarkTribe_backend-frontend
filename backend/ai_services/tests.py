from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from .engines import chatbot


class ChatbotAnswerTests(SimpleTestCase):
    def test_delivery_question_uses_store_guidance(self):
        reply, products = chatbot.answer("How long does delivery take?")

        self.assertIn("1–3 business days", reply)
        self.assertEqual(products, [])

    @patch("orders.models.Order.objects.filter")
    def test_order_lookup_is_limited_to_signed_in_user(self, filter_orders):
        user = SimpleNamespace(is_authenticated=True)
        order = SimpleNamespace(
            order_number="ORDER12345",
            get_status_display=lambda: "Shipped",
        )
        filter_orders.return_value.first.return_value = order

        reply, _ = chatbot.answer("Where is order ORDER12345?", user=user)

        filter_orders.assert_called_once_with(order_number="ORDER12345", user=user)
        self.assertIn("Shipped", reply)

    @patch("orders.models.Order.objects.filter")
    def test_guest_order_lookup_does_not_query_private_order_data(self, filter_orders):
        reply, products = chatbot.answer("Track order ORDER12345")

        filter_orders.assert_not_called()
        self.assertIn("sign in", reply)
        self.assertEqual(products, [])


# ---- Virtual try-on / size guidance ----
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient
from .engines import sizing, tryon


class SizingTests(SimpleTestCase):
    cols = ["Size", "Age", "Height (cm)"]
    rows = [["2-3Y", "2-3", "92-98"], ["4-5Y", "4-5", "104-110"], ["6-7Y", "6-7", "116-122"]]

    def test_exact_height(self):
        self.assertEqual(sizing.recommend(self.cols, self.rows, height_cm=106)["size"], "4-5Y")

    def test_nearest_when_between_rows(self):
        out = sizing.recommend(self.cols, self.rows, height_cm=100)
        self.assertEqual(out["size"], "2-3Y")
        self.assertFalse(out["exact"])

    def test_no_inputs(self):
        self.assertIsNone(sizing.recommend(self.cols, self.rows)["size"])


class TryOnApiTests(TestCase):
    def test_requires_consent(self):
        r = APIClient().post("/api/ai/try-on/", {"product_id": 1}, format="multipart")
        self.assertEqual(r.status_code, 400)

    def test_not_configured_returns_503(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        photo = SimpleUploadedFile("p.jpg", b"x", content_type="image/jpeg")
        r = APIClient().post("/api/ai/try-on/", {"consent": "true", "product_id": 1, "photo": photo}, format="multipart")
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.json()["code"], "not_configured")

    def test_normalise_rejects_non_image(self):
        with self.assertRaises(tryon.InvalidPhoto):
            tryon.normalise_photo(b"not an image")
