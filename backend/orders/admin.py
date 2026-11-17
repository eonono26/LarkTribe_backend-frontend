from django.contrib import admin
from .models import Order, OrderItem, Coupon, MpesaTransaction


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


class MpesaTransactionInline(admin.TabularInline):
    model = MpesaTransaction
    extra = 0
    can_delete = False
    readonly_fields = ["phone", "amount", "status", "receipt", "result_code", "result_desc", "checkout_request_id", "created_at"]
    exclude = ["raw_callback", "merchant_request_id"]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["order_number", "status", "payment_method", "mpesa_receipt", "total", "created_at"]
    list_filter = ["status", "payment_method"]
    search_fields = ["order_number", "mpesa_receipt", "shipping_phone"]
    inlines = [OrderItemInline, MpesaTransactionInline]


@admin.register(MpesaTransaction)
class MpesaTransactionAdmin(admin.ModelAdmin):
    list_display = ["order", "phone", "amount", "status", "receipt", "created_at"]
    list_filter = ["status"]
    search_fields = ["receipt", "phone", "order__order_number", "checkout_request_id"]


admin.site.register(Coupon)
