from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_name", "unit_price", "quantity", "subtotal", "fulfillment_status"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "status", "payment_method", "subtotal", "shipping_fee",
            "discount_total", "total", "shipping_name", "shipping_phone", "shipping_address",
            "shipping_city", "coupon_code", "guest_email", "items", "created_at",
        ]
        read_only_fields = ["order_number", "status", "subtotal", "total", "items", "created_at"]


class CheckoutSerializer(serializers.Serializer):
    """Accepts guest (email only) or member (authenticated) checkout, matching the
    guest-checkout / member-login toggle on the storefront."""
    guest_email = serializers.EmailField(required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(choices=Order.PaymentMethod.choices)
    shipping_name = serializers.CharField(max_length=150)
    shipping_phone = serializers.CharField(max_length=20)
    shipping_address = serializers.CharField()
    shipping_city = serializers.CharField(max_length=100)
    coupon_code = serializers.CharField(required=False, allow_blank=True)
