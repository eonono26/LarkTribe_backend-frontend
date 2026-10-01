from rest_framework import serializers
from .models import Cart, CartItem
from catalog.serializers import ProductListSerializer, ProductVariantSerializer
from catalog.utils import image_for_color


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(source="product", queryset=CartItem._meta.get_field("product").related_model.objects.all(), write_only=True)
    # Nested so the frontend can show the chosen color/size on the cart
    # drawer and checkout page, not just an opaque variant id.
    variant = ProductVariantSerializer(read_only=True)
    variant_id = serializers.PrimaryKeyRelatedField(
        source="variant",
        queryset=CartItem._meta.get_field("variant").related_model.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    # Photo of the color the shopper actually picked (falls back to the
    # product's first photo). Lets the bag / checkout show the White item in
    # white rather than whichever photo happens to be first.
    image = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["id", "product", "product_id", "variant", "variant_id", "image", "quantity", "subtotal"]

    def get_image(self, obj):
        color = obj.variant.color if obj.variant else ""
        return image_for_color(obj.product, color, self.context.get("request"))


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Cart
        fields = ["id", "items", "total"]
