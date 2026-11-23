from rest_framework import serializers
from .models import TryOnRequest


class TryOnSerializer(serializers.ModelSerializer):
    result_url = serializers.SerializerMethodField()
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    outfit = serializers.SerializerMethodField()
    share_path = serializers.SerializerMethodField()

    class Meta:
        model = TryOnRequest
        fields = ["id", "status", "error", "product", "product_name", "product_slug", "color", "outfit",
                  "result_url", "is_saved", "is_shared", "share_path", "created_at", "expires_at"]

    def _abs(self, f):
        if not f:
            return None
        req = self.context.get("request")
        return req.build_absolute_uri(f.url) if req else f.url

    def get_result_url(self, obj):
        return self._abs(obj.result_image)

    def get_outfit(self, obj):
        return [{"id": p.id, "name": p.name, "slug": p.slug} for p in obj.extra_products.all()]

    def get_share_path(self, obj):
        return f"/look/{obj.share_token}" if obj.is_shared else None
