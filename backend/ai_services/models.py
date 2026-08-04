from django.conf import settings
from django.db import models


class ChatSession(models.Model):
    """AI shopping-assistant / chatbot conversation."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name="chat_sessions")
    session_key = models.CharField(max_length=64, blank=True, db_index=True)
    started_at = models.DateTimeField(auto_now_add=True)


class ChatMessage(models.Model):
    class Sender(models.TextChoices):
        USER = "user", "User"
        BOT = "bot", "Assistant"

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="messages")
    sender = models.CharField(max_length=10, choices=Sender.choices)
    text = models.TextField()
    products = models.ManyToManyField("catalog.Product", blank=True, related_name="chat_mentions")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class CustomerSegment(models.Model):
    """RFM-style segmentation, recomputed periodically by the segmentation engine."""

    class Segment(models.TextChoices):
        VIP = "vip", "VIP / champion"
        LOYAL = "loyal", "Loyal"
        NEW = "new", "New customer"
        AT_RISK = "at_risk", "At risk"
        CHURNED = "churned", "Churned"
        LOW_VALUE = "low_value", "Low value"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="segment")
    segment = models.CharField(max_length=20, choices=Segment.choices, default=Segment.NEW)
    recency_days = models.PositiveIntegerField(default=0)
    frequency = models.PositiveIntegerField(default=0)
    monetary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    churn_risk_score = models.FloatField(default=0.0, help_text="0 (safe) - 1 (very likely to churn)")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-monetary"]


class ProductPricingSuggestion(models.Model):
    """Dynamic pricing recommendation engine output."""
    product = models.OneToOneField("catalog.Product", on_delete=models.CASCADE, related_name="pricing_suggestion")
    suggested_price = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.CharField(max_length=255)
    confidence = models.FloatField(default=0.5)
    generated_at = models.DateTimeField(auto_now=True)


class DemandForecast(models.Model):
    """Sales/inventory forecasting engine output per product."""
    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="forecasts")
    period_start = models.DateField()
    forecast_units = models.FloatField()
    reorder_recommended = models.BooleanField(default=False)
    reorder_quantity = models.PositiveIntegerField(default=0)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-generated_at"]


class FraudSignal(models.Model):
    """Fraud detection engine output per order."""
    order = models.OneToOneField("orders.Order", on_delete=models.CASCADE, related_name="fraud_signal")
    risk_score = models.FloatField(default=0.0)
    reasons = models.JSONField(default=list, blank=True)
    flagged = models.BooleanField(default=False)
    reviewed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
