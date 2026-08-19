from rest_framework import serializers
from orders.models import Coupon
from .models import Campaign, ShowcaseVideo, CouponClaim


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ["id", "code", "percent_off", "amount_off", "active", "valid_until", "is_public"]


class CouponWalletSerializer(serializers.ModelSerializer):
    """Public coupon list for the 'My Coupons' page — flags whether the
    requesting user has already saved each one."""
    saved = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = ["id", "code", "percent_off", "amount_off", "valid_until", "saved"]

    def get_saved(self, obj):
        claimed_ids = self.context.get("claimed_ids", set())
        return obj.id in claimed_ids


class CouponClaimSerializer(serializers.ModelSerializer):
    coupon = CouponSerializer(read_only=True)

    class Meta:
        model = CouponClaim
        fields = ["id", "coupon", "claimed_at", "used_at"]


class CampaignSerializer(serializers.ModelSerializer):
    is_live = serializers.BooleanField(read_only=True)

    class Meta:
        model = Campaign
        fields = [
            "id", "title", "description", "placement", "style", "background_color", "cta_label",
            "image", "link_url", "department", "coupon", "is_ai_generated", "active",
            "starts_at", "ends_at", "is_live", "created_at",
        ]
        read_only_fields = ["is_ai_generated", "created_at", "is_live"]


class ShowcaseVideoSerializer(serializers.ModelSerializer):
    video_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    product_slug = serializers.CharField(source="product.slug", read_only=True, default=None)
    department_slug = serializers.CharField(source="department.slug", read_only=True, default=None)
    resolved_link = serializers.SerializerMethodField()

    class Meta:
        model = ShowcaseVideo
        fields = [
            "id", "title", "video", "video_url", "thumbnail", "thumbnail_url", "cta_label",
            "link_url", "product", "product_slug", "department", "department_slug",
            "resolved_link", "order", "active", "created_at",
        ]
        read_only_fields = ["created_at"]

    def get_video_url(self, obj):
        if not obj.video:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.video.url) if request else obj.video.url

    def get_thumbnail_url(self, obj):
        if not obj.thumbnail:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.thumbnail.url) if request else obj.thumbnail.url

    def get_resolved_link(self, obj):
        if obj.link_url:
            return obj.link_url
        if obj.product_id:
            return f"/product/{obj.product.slug}"
        if obj.department_id:
            return f"/category/{obj.department.slug}"
        return None


class CouponValidateSerializer(serializers.Serializer):
    code = serializers.CharField()
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
