from django.contrib import admin
from .models import Order, OrderItem, Coupon


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["order_number", "status", "payment_method", "total", "created_at"]
    list_filter = ["status", "payment_method"]
    inlines = [OrderItemInline]


admin.site.register(Coupon)
