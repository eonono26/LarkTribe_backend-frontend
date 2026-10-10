from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db.models import Count
from rest_framework import serializers

from catalog.models import (
    AgeGroup, Brand, Category, Department, Product, ProductImage, ProductVariant,
)
from orders.models import Order
from orders.serializers import OrderItemSerializer

User = get_user_model()


def _abs(request, f):
    """Absolute URL for a FileField/ImageField value, or None."""
    if not f:
        return None
    try:
        url = f.url
    except ValueError:
        return None
    return request.build_absolute_uri(url) if request else url


# ----------------------------------------------------------------------
# Media (department / category / brand / age-group all share one shape)
# ----------------------------------------------------------------------

def media_payload(obj, request):
    return [
        {
            "id": m.id,
            "file": _abs(request, m.file),
            "media_type": m.media_type,
            "alt_text": m.alt_text,
            "is_primary": m.is_primary,
            "order": m.order,
        }
        for m in obj.media_files.all()
    ]


class MediaMixin(serializers.Serializer):
    media = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    def get_media(self, obj):
        return media_payload(obj, self.context.get("request"))

    def get_image_url(self, obj):
        request = self.context.get("request")
        files = list(obj.media_files.all())
        images = [m for m in files if m.media_type == "image"]
        primary = next((m for m in images if m.is_primary), None) or (images[0] if images else None)
        return _abs(request, primary.file) if primary else None


# ----------------------------------------------------------------------
# Catalog structure
# ----------------------------------------------------------------------

class AdminDepartmentSerializer(MediaMixin, serializers.ModelSerializer):
    category_count = serializers.IntegerField(read_only=True)
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Department
        fields = [
            "id", "name", "slug", "order", "description", "is_active",
            "created_at", "updated_at", "category_count", "product_count", "media", "image_url",
        ]
        read_only_fields = ["created_at", "updated_at"]
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}


class AdminCategorySerializer(MediaMixin, serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    parent_name = serializers.CharField(source="parent.name", read_only=True, default=None)
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = [
            "id", "department", "department_name", "parent", "parent_name", "name", "slug",
            "order", "description", "is_active", "created_at", "updated_at",
            "product_count", "media", "image_url",
        ]
        read_only_fields = ["created_at", "updated_at"]
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}

    def validate(self, attrs):
        parent = attrs.get("parent")
        if parent is not None and self.instance is not None and parent.pk == self.instance.pk:
            raise serializers.ValidationError({"parent": "A category cannot be its own parent."})
        return attrs


class AdminBrandSerializer(MediaMixin, serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = [
            "id", "name", "slug", "logo", "logo_url", "description", "website", "is_active",
            "created_at", "updated_at", "product_count", "media", "image_url",
        ]
        read_only_fields = ["created_at", "updated_at"]
        extra_kwargs = {
            "slug": {"required": False, "allow_blank": True},
            "logo": {"required": False, "allow_null": True},
        }

    def get_logo_url(self, obj):
        return _abs(self.context.get("request"), obj.logo)


class AdminAgeGroupSerializer(MediaMixin, serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = AgeGroup
        fields = [
            "id", "name", "slug", "stage", "min_age_years", "max_age_years", "icon", "order",
            "is_active", "created_at", "product_count", "media", "image_url",
        ]
        read_only_fields = ["created_at"]
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}


# ----------------------------------------------------------------------
# Products
# ----------------------------------------------------------------------

class AdminProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    view_display = serializers.CharField(source="get_view_display", read_only=True)

    class Meta:
        model = ProductImage
        fields = ["id", "url", "alt_text", "color", "view", "view_display", "is_primary", "order"]

    def get_url(self, obj):
        return _abs(self.context.get("request"), obj.image)


class AdminProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ["id", "size", "color", "stock", "sku_suffix"]


class AdminProductSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source="vendor.store_name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    department_name = serializers.CharField(source="category.department.name", read_only=True)
    brand_name = serializers.CharField(source="brand.name", read_only=True, default=None)
    primary_image = serializers.SerializerMethodField()
    images = AdminProductImageSerializer(many=True, read_only=True)
    variants = AdminProductVariantSerializer(many=True, read_only=True)
    discount_percent = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "vendor", "vendor_name", "category", "category_name", "department_name",
            "brand", "brand_name", "age_groups", "gender", "name", "slug", "description",
            "features", "materials", "care_instructions", "price", "compare_at_price",
            "discount_percent", "stock", "sku", "status", "is_featured", "rating_avg",
            "rating_count", "created_at", "updated_at", "primary_image", "images", "variants",
        ]
        read_only_fields = ["rating_avg", "rating_count", "created_at", "updated_at"]
        extra_kwargs = {
            "slug": {"required": False, "allow_blank": True},
            "age_groups": {"required": False},
        }

    def get_primary_image(self, obj):
        images = list(obj.images.all())
        return _abs(self.context.get("request"), images[0].image) if images else None

    def get_discount_percent(self, obj):
        if obj.compare_at_price and obj.compare_at_price > obj.price:
            return int(round((obj.compare_at_price - obj.price) * 100 / obj.compare_at_price))
        return 0

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0.")
        return value

    def validate_features(self, value):
        if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
            raise serializers.ValidationError("Features must be a list of short text lines.")
        return [v.strip() for v in value if v.strip()]

    def validate(self, attrs):
        price = attrs.get("price", getattr(self.instance, "price", None))
        compare = attrs.get("compare_at_price", getattr(self.instance, "compare_at_price", None))
        if compare is not None and price is not None and compare <= price:
            raise serializers.ValidationError({"compare_at_price": "Compare-at price must be greater than the price."})
        return attrs


# ----------------------------------------------------------------------
# Orders
# ----------------------------------------------------------------------

class AdminOrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    customer = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "status", "status_display", "payment_method",
            "payment_method_display", "subtotal", "shipping_fee", "discount_total",
            "member_discount_total", "total", "shipping_name", "shipping_phone",
            "shipping_address", "shipping_city", "coupon_code", "mpesa_receipt", "guest_email",
            "customer", "items", "items_count", "created_at", "updated_at",
        ]
        read_only_fields = fields

    def get_items_count(self, obj):
        return sum(i.quantity for i in obj.items.all())

    def get_customer(self, obj):
        if obj.user:
            full = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return {"id": obj.user.id, "username": obj.user.username, "name": full or obj.user.username,
                    "email": obj.user.email, "is_guest": False}
        return {"id": None, "username": None, "name": obj.shipping_name, "email": obj.guest_email or "",
                "is_guest": True}


class AdminOrderListSerializer(AdminOrderSerializer):
    """Lighter payload for tables — no line items."""

    class Meta(AdminOrderSerializer.Meta):
        fields = [f for f in AdminOrderSerializer.Meta.fields if f != "items"]
        read_only_fields = fields


# ----------------------------------------------------------------------
# Users
# ----------------------------------------------------------------------

class AdminUserSerializer(serializers.ModelSerializer):
    orders_count = serializers.IntegerField(read_only=True)
    profile_picture_url = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name", "phone", "role", "is_active",
            "is_staff", "date_joined", "last_login", "orders_count", "profile_picture_url", "password",
        ]
        read_only_fields = ["date_joined", "last_login"]

    def get_profile_picture_url(self, obj):
        return _abs(self.context.get("request"), obj.profile_picture)

    def validate_password(self, value):
        if value:
            validate_password(value)
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "A password is required for new users."})
        if self.instance is not None and request and self.instance.pk == request.user.pk:
            if attrs.get("is_active") is False:
                raise serializers.ValidationError({"is_active": "You can't deactivate your own account."})
            if self.instance.role == "admin" and attrs.get("role", "admin") != "admin":
                raise serializers.ValidationError({"role": "You can't remove your own admin role."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        if user.role == "admin":
            user.is_staff = True
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        # Several older endpoints (AI, vendors) check Django's is_staff, so keep it in step with the role.
        if validated_data.get("role") == "admin":
            instance.is_staff = True
        if password:
            instance.set_password(password)
        instance.save()
        return instance
