from rest_framework import serializers
from orders.models import Coupon
from .models import Campaign


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ["id", "code", "percent_off", "amount_off", "active", "valid_until"]


class CampaignSerializer(serializers.ModelSerializer):
    is_live = serializers.BooleanField(read_only=True)

    class Meta:
        model = Campaign
        fields = [
            "id", "title", "description", "placement", "image", "link_url", "department",
            "coupon", "is_ai_generated", "active", "starts_at", "ends_at", "is_live", "created_at",
        ]
        read_only_fields = ["is_ai_generated", "created_at", "is_live"]


class CouponValidateSerializer(serializers.Serializer):
    code = serializers.CharField()
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
