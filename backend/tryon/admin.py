from django.contrib import admin
from .models import TryOnRequest


@admin.register(TryOnRequest)
class TryOnRequestAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "product", "status", "provider", "is_saved", "created_at"]
    list_filter = ["status", "provider", "is_saved"]
    search_fields = ["user__username", "user__email", "product__name"]
    readonly_fields = ["consent_at", "created_at", "share_token"]
