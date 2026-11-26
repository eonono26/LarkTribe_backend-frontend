from rest_framework import serializers
from catalog.utils import image_for_color
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    product_image = serializers.SerializerMethodField()
    product_slug = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id", "product", "product_name", "product_image", "product_slug",
            "variant", "variant_label",
            "unit_price", "quantity", "subtotal", "fulfillment_status",
        ]

    def get_product_image(self, obj):
        if not obj.product:
            return None
        # Prefer the live variant's color; if the variant was later deleted,
        # fall back to the "Color / Size" snapshot taken at purchase time.
        if obj.variant:
            color = obj.variant.color
        else:
            color = (obj.variant_label or "").split(" / ")[0]
        return image_for_color(obj.product, color, self.context.get("request"))

    def get_product_slug(self, obj):
        return obj.product.slug if obj.product else None


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "status", "payment_method", "subtotal", "shipping_fee",
            "discount_total", "member_discount_total", "total", "shipping_name", "shipping_phone", "shipping_address",
            "shipping_city", "shipping_lat", "shipping_lng", "coupon_code", "guest_email", "mpesa_receipt", "payment_provider", "items", "created_at",
        ]
        read_only_fields = ["order_number", "status", "subtotal", "total", "items", "created_at", "mpesa_receipt", "payment_provider"]


class CheckoutSerializer(serializers.Serializer):
    """Accepts guest (email only) or member (authenticated) checkout, matching the
    guest-checkout / member-login toggle on the storefront."""
    guest_email = serializers.EmailField(required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(choices=Order.PaymentMethod.choices)
    shipping_name = serializers.CharField(max_length=150)
    shipping_phone = serializers.CharField(max_length=20)
    shipping_address = serializers.CharField()
    shipping_city = serializers.CharField(max_length=100)
    shipping_lat = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    shipping_lng = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    coupon_code = serializers.CharField(required=False, allow_blank=True)
    mpesa_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    card_provider = serializers.ChoiceField(choices=[("stripe", "Stripe"), ("paystack", "Paystack")], required=False, allow_blank=True)
