from django.contrib import admin
from .models import Vendor


def _notify_vendor(vendor, title, body):
    from notifications.utils import notify
    from notifications.models import Notification
    notify(vendor.user, title=title, body=body, category=Notification.Category.VENDOR, channel=Notification.Channel.IN_APP)


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ["store_name", "user", "status", "commission_rate", "created_at"]
    list_filter = ["status"]
    actions = ["approve_vendors", "suspend_vendors"]

    def approve_vendors(self, request, queryset):
        queryset.update(status="approved")
        for vendor in queryset:
            _notify_vendor(vendor, "Your vendor application was approved", "You can now list products on duka.")
    approve_vendors.short_description = "Approve selected vendors"

    def suspend_vendors(self, request, queryset):
        queryset.update(status="suspended")
        for vendor in queryset:
            _notify_vendor(vendor, "Your vendor account was suspended", "Contact support for details.")
    suspend_vendors.short_description = "Suspend selected vendors"
