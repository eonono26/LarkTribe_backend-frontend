from django.contrib import admin
from .models import Currency, Language


@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "symbol", "rate_to_base", "is_base", "is_default", "is_active", "order", "updated_at"]
    list_editable = ["rate_to_base", "is_active", "order"]
    ordering = ["order", "code"]


@admin.register(Language)
class LanguageAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "native_name", "flag", "is_default", "is_active", "order", "updated_at"]
    list_editable = ["is_active", "order"]
    ordering = ["order", "code"]
