from django.contrib import admin
from .models import Campaign, ShowcaseVideo


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ["title", "placement", "style", "active", "is_ai_generated", "starts_at", "ends_at"]
    list_filter = ["placement", "style", "active", "is_ai_generated"]


@admin.register(ShowcaseVideo)
class ShowcaseVideoAdmin(admin.ModelAdmin):
    list_display = ["title", "product", "department", "order", "active", "created_at"]
    list_filter = ["active"]
    ordering = ["order", "-created_at"]
