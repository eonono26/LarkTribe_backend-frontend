from django.contrib import admin
from .models import PickupPoint, LocationEvent


@admin.register(PickupPoint)
class PickupPointAdmin(admin.ModelAdmin):
    list_display = ["name", "city", "address", "opening_hours", "is_active"]
    list_filter = ["city", "is_active"]


@admin.register(LocationEvent)
class LocationEventAdmin(admin.ModelAdmin):
    list_display = ["city", "lat", "lng", "created_at"]
    list_filter = ["city"]
