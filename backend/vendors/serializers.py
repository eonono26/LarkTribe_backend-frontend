from rest_framework import serializers
from .models import Vendor


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ["id", "store_name", "slug", "description", "logo", "status", "commission_rate", "created_at"]
        read_only_fields = ["id", "status", "commission_rate", "created_at"]


class VendorApplySerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ["store_name", "slug", "description", "logo"]


class VendorAdminSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Vendor
        fields = ["id", "username", "store_name", "slug", "description", "logo", "status", "commission_rate", "created_at"]
        read_only_fields = ["id", "username", "store_name", "slug", "description", "logo", "commission_rate", "created_at"]
