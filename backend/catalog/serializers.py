from rest_framework import serializers
from .models import Department, Category, Brand, Product, ProductImage, ProductVariant, Review, Wishlist


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name", "slug", "order"]


class CategorySerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)

    class Meta:
        model = Category
        fields = ["id", "department", "parent", "name", "slug", "order"]


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ["id", "name", "slug"]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "alt_text", "order"]


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ["id", "size", "color", "stock", "sku_suffix"]


class ReviewSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Review
        fields = ["id", "user", "rating", "comment", "created_at"]
        read_only_fields = ["user", "created_at"]


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for grid/listing views."""
    image = serializers.SerializerMethodField()
    vendor_name = serializers.CharField(source="vendor.store_name", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "price", "compare_at_price", "discount_percent",
            "rating_avg", "rating_count", "image", "vendor_name", "is_featured",
        ]

    def get_image(self, obj):
        first = obj.images.first()
        if first:
            return first.image.url
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    vendor_name = serializers.CharField(source="vendor.store_name", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "description", "price", "compare_at_price", "discount_percent",
            "stock", "sku", "status", "rating_avg", "rating_count", "category", "brand",
            "vendor_name", "images", "variants", "reviews", "created_at",
        ]


class ProductWriteSerializer(serializers.ModelSerializer):
    """Used by vendors to create/update their own products."""

    class Meta:
        model = Product
        fields = [
            "id", "category", "brand", "name", "description", "price", "compare_at_price",
            "stock", "sku", "status",
        ]
        read_only_fields = ["id"]

    def validate_status(self, value):
        # vendors cannot self-approve; forced to pending on create/edit
        return Product.Status.PENDING


class WishlistSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source="product", write_only=True
    )

    class Meta:
        model = Wishlist
        fields = ["id", "product", "product_id", "created_at"]
