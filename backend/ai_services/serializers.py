from rest_framework import serializers
from catalog.serializers import ProductListSerializer
from .models import ChatSession, ChatMessage, CustomerSegment, ProductPricingSuggestion, DemandForecast, FraudSignal, SavedLook


class ChatMessageSerializer(serializers.ModelSerializer):
    products = ProductListSerializer(many=True, read_only=True)

    class Meta:
        model = ChatMessage
        fields = ["id", "sender", "text", "products", "created_at"]


class ChatAskSerializer(serializers.Serializer):
    session_id = serializers.IntegerField(required=False)
    message = serializers.CharField()


class CustomerSegmentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = CustomerSegment
        fields = ["id", "username", "segment", "recency_days", "frequency", "monetary", "churn_risk_score", "updated_at"]


class FraudSignalSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)

    class Meta:
        model = FraudSignal
        fields = ["id", "order_number", "risk_score", "reasons", "flagged", "reviewed", "created_at"]


class SavedLookSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = SavedLook
        fields = ["id", "product", "product_name", "product_slug", "color", "image", "image_url", "created_at"]
        read_only_fields = ["id", "product_name", "product_slug", "image_url", "created_at"]
        extra_kwargs = {"image": {"write_only": True}}

    def get_image_url(self, obj):
        request = self.context.get("request")
        url = obj.image.url if obj.image else ""
        return request.build_absolute_uri(url) if request and url else url
