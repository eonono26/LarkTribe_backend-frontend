from django.contrib import admin
from .models import Department, Category, Brand, Product, ProductImage, ProductVariant, Review, Wishlist


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "vendor", "category", "price", "stock", "status", "is_featured"]
    list_filter = ["status", "category__department", "is_featured"]
    search_fields = ["name", "sku"]
    inlines = [ProductImageInline, ProductVariantInline]
    actions = ["approve_products", "reject_products"]

    def approve_products(self, request, queryset):
        queryset.update(status="active")
        self._notify(queryset, "Product approved", "is now live on the storefront.")
    approve_products.short_description = "Approve & publish selected products"

    def reject_products(self, request, queryset):
        queryset.update(status="rejected")
        self._notify(queryset, "Product rejected", "was rejected during moderation — check the listing details.")
    reject_products.short_description = "Reject selected products"

    def _notify(self, queryset, title_prefix, body_suffix):
        from notifications.utils import notify
        from notifications.models import Notification
        for product in queryset.select_related("vendor__user"):
            notify(
                product.vendor.user, title=f"{title_prefix}: {product.name}",
                body=f"'{product.name}' {body_suffix}",
                category=Notification.Category.VENDOR, channel=Notification.Channel.IN_APP,
            )


admin.site.register(Department)
admin.site.register(Category)
admin.site.register(Brand)
admin.site.register(Review)
admin.site.register(Wishlist)
