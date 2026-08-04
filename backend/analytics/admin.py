from django.contrib import admin
from .models import BehaviorEvent, DailyMetric


@admin.register(BehaviorEvent)
class BehaviorEventAdmin(admin.ModelAdmin):
    list_display = ["event_type", "user", "product", "search_query", "device_type", "created_at"]
    list_filter = ["event_type", "device_type"]
    search_fields = ["search_query"]


admin.site.register(DailyMetric)
