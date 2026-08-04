from django.contrib import admin
from .models import DeviceToken, NotificationPreference, Notification, SupportTicket, SupportReply


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "channel", "category", "is_read", "sent_at"]
    list_filter = ["channel", "category", "is_read"]


class SupportReplyInline(admin.TabularInline):
    model = SupportReply
    extra = 0


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ["subject", "user", "status", "created_at"]
    list_filter = ["status"]
    inlines = [SupportReplyInline]


admin.site.register(DeviceToken)
admin.site.register(NotificationPreference)
