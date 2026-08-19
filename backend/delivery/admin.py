from django.contrib import admin
from .models import Driver, Delivery, DeliveryEvent


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ["display_name", "phone", "vehicle_type", "vehicle_plate", "is_active", "is_online", "current_lat", "current_lng", "last_location_at", "rating_avg"]
    list_filter = ["is_active", "is_online", "vehicle_type"]
    list_editable = ["is_active"]
    search_fields = ["user__username", "user__first_name", "user__last_name", "phone", "vehicle_plate"]


class DeliveryEventInline(admin.TabularInline):
    model = DeliveryEvent
    extra = 0
    readonly_fields = ["status", "note", "lat", "lng", "created_at"]
    can_delete = False


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ["id", "order", "status", "driver", "pickup_label", "dropoff_label", "assigned_at", "delivered_at"]
    list_filter = ["status"]
    search_fields = ["order__order_number", "dropoff_label"]
    inlines = [DeliveryEventInline]
