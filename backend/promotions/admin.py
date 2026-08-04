from django.contrib import admin
from .models import Campaign


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ["title", "placement", "active", "is_ai_generated", "starts_at", "ends_at"]
    list_filter = ["placement", "active", "is_ai_generated"]
