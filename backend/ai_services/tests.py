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
