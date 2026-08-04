from rest_framework import serializers
from catalog.serializers import ProductListSerializer
from .models import ChatSession, ChatMessage, CustomerSegment, ProductPricingSuggestion, DemandForecast, FraudSignal


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
