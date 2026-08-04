from rest_framework import serializers
from .models import BehaviorEvent, DailyMetric


class BehaviorEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = BehaviorEvent
        fields = [
            "id", "session_key", "event_type", "product", "category", "brand", "search_query",
            "duration_seconds", "device_type", "browser", "app_version", "city",
            "campaign_source", "metadata", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class DailyMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyMetric
        fields = "__all__"
