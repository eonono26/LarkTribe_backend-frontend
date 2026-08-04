from django.contrib import admin
from .models import ChatSession, ChatMessage, CustomerSegment, ProductPricingSuggestion, DemandForecast, FraudSignal


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "started_at"]
    inlines = [ChatMessageInline]


@admin.register(CustomerSegment)
class CustomerSegmentAdmin(admin.ModelAdmin):
    list_display = ["user", "segment", "recency_days", "frequency", "monetary", "churn_risk_score"]
    list_filter = ["segment"]


@admin.register(FraudSignal)
class FraudSignalAdmin(admin.ModelAdmin):
    list_display = ["order", "risk_score", "flagged", "reviewed", "created_at"]
    list_filter = ["flagged", "reviewed"]


admin.site.register(ProductPricingSuggestion)
admin.site.register(DemandForecast)
