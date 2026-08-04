from rest_framework import serializers
from .models import DeviceToken, NotificationPreference, Notification, SupportTicket, SupportReply


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ["id", "token", "platform", "created_at"]
        read_only_fields = ["created_at"]


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ["push_enabled", "email_enabled", "order_updates", "promotions", "recommendations"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "channel", "category", "title", "body", "link", "is_read", "sent_at"]
        read_only_fields = fields


class SupportReplySerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.username", read_only=True)

    class Meta:
        model = SupportReply
        fields = ["id", "author_name", "is_staff_reply", "message", "created_at"]
        read_only_fields = ["author_name", "is_staff_reply", "created_at"]


class SupportTicketSerializer(serializers.ModelSerializer):
    replies = SupportReplySerializer(many=True, read_only=True)
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = SupportTicket
        fields = ["id", "user_name", "order", "subject", "message", "status", "created_at", "updated_at", "replies"]
        read_only_fields = ["status", "created_at", "updated_at", "user_name", "replies"]
