from django.conf import settings
from django.db import models


class DeviceToken(models.Model):
    """Push notification token registered from web or mobile (FCM/APNs)."""

    class Platform(models.TextChoices):
        WEB = "web", "Web"
        ANDROID = "android", "Android"
        IOS = "ios", "iOS"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="device_tokens")
    token = models.CharField(max_length=255, unique=True)
    platform = models.CharField(max_length=10, choices=Platform.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.platform}"


class NotificationPreference(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_prefs")
    push_enabled = models.BooleanField(default=True)
    email_enabled = models.BooleanField(default=True)
    order_updates = models.BooleanField(default=True)
    promotions = models.BooleanField(default=True)
    recommendations = models.BooleanField(default=True)


class Notification(models.Model):
    """A single in-app / push / email notification sent to a user."""

    class Channel(models.TextChoices):
        PUSH = "push", "Push"
        EMAIL = "email", "Email"
        IN_APP = "in_app", "In-app"

    class Category(models.TextChoices):
        ORDER = "order", "Order update"
        PROMOTION = "promotion", "Promotion"
        RECOMMENDATION = "recommendation", "AI recommendation"
        VENDOR = "vendor", "Vendor / moderation"
        SYSTEM = "system", "System"
        SUPPORT = "support", "Customer support"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    channel = models.CharField(max_length=10, choices=Channel.choices, default=Channel.IN_APP)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.SYSTEM)
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    link = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sent_at"]

    def __str__(self):
        return f"{self.title} -> {self.user}"


class SupportTicket(models.Model):
    """Admin 'Customer Support' queue."""

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In progress"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="support_tickets")
    order = models.ForeignKey("orders.Order", on_delete=models.SET_NULL, null=True, blank=True, related_name="support_tickets")
    subject = models.CharField(max_length=200)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class SupportReply(models.Model):
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name="replies")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    is_staff_reply = models.BooleanField(default=False)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
