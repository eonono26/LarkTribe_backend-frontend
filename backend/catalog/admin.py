from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from .models import (
    Department, Category, Brand, Product, ProductImage, 
    ProductVariant, Review, Wishlist, DepartmentMedia, CategoryMedia
)


class ProductImageInline(admin.TabularInline):
    """Inline editor for product images"""
    model = ProductImage
    extra = 1
    fields = ['image', 'alt_text', 'order', 'image_preview']
    readonly_fields = ['image_preview']
    
    def image_preview(self, obj):
        if obj and obj.image:
            return format_html(
                '<img src="{}" width="80" height="80" style="object-fit:cover; border-radius:4px;" />',
                obj.image.url
            )
        return "No image"
    image_preview.short_description = "Preview"


class ProductVariantInline(admin.TabularInline):
    """Inline editor for product variants"""
    model = ProductVariant
    extra = 1
    fields = ['size', 'color', 'stock', 'sku_suffix']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'name', 'vendor', 'category', 'price', 'stock', 
        'status', 'is_featured', 'image_preview', 'rating_display'
    ]
    list_filter = ['status', 'category__department', 'is_featured', 'vendor']
    search_fields = ['name', 'sku', 'vendor__store_name']
    list_editable = ['price', 'stock', 'status', 'is_featured']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at', 'updated_at', 'rating_avg', 'rating_count']
    inlines = [ProductImageInline, ProductVariantInline]
    actions = ["approve_products", "reject_products"]
    fieldsets = (
        ('Basic Information', {
            'fields': ('vendor', 'category', 'brand', 'name', 'slug', 'description')
        }),
        ('Pricing & Stock', {
            'fields': ('price', 'compare_at_price', 'stock', 'sku')
        }),
        ('Status & Ratings', {
            'fields': ('status', 'is_featured', 'rating_avg', 'rating_count')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def image_preview(self, obj):
        """Show preview of first product image"""
        first_image = obj.images.first()
        if first_image and first_image.image:
            return format_html(
                '<img src="{}" width="50" height="50" style="object-fit:cover; border-radius:4px;" />',
                first_image.image.url
            )
        return "No image"
    image_preview.short_description = "Image"

    def rating_display(self, obj):
        """Display rating with stars"""
        if obj.rating_count > 0:
            filled = '★' * min(5, int(round(obj.rating_avg)))
            empty = '☆' * (5 - min(5, int(round(obj.rating_avg))))
            return format_html(
                '<span style="color: #f59e0b;">{}</span> ({})',
                filled + empty,
                obj.rating_count
            )
        return "No reviews"
    rating_display.short_description = "Rating"

    def approve_products(self, request, queryset):
        """Approve and publish selected products"""
        count = queryset.update(status=Product.Status.ACTIVE)
        self._notify(queryset, "Product Approved", "has been approved and is now live on the storefront.")
        self.message_user(request, f"{count} product(s) approved successfully.")
    approve_products.short_description = "Approve & publish selected products"

    def reject_products(self, request, queryset):
        """Reject selected products"""
        count = queryset.update(status=Product.Status.REJECTED)
        self._notify(queryset, "Product Rejected", "was rejected during moderation — please check the listing details.")
        self.message_user(request, f"{count} product(s) rejected.")
    reject_products.short_description = "Reject selected products"

    def _notify(self, queryset, title_prefix, body_suffix):
        """Send notifications to vendors"""
        try:
            from notifications.utils import notify
            from notifications.models import Notification
            
            for product in queryset.select_related("vendor__user"):
                if product.vendor and product.vendor.user:
                    notify(
                        product.vendor.user,
                        title=f"{title_prefix}: {product.name}",
                        body=f"'{product.name}' {body_suffix}",
                        category=Notification.Category.VENDOR,
                        channel=Notification.Channel.IN_APP,
                    )
        except ImportError:
            # Notifications app not installed - skip silently
            pass
        except Exception as e:
            # Log error but don't break the admin action
            print(f"Error sending notification: {e}")

    def get_queryset(self, request):
        """Optimize queryset with related fields"""
        return super().get_queryset(request).select_related(
            'vendor', 'category', 'brand'
        ).prefetch_related('images')


class DepartmentMediaInline(admin.TabularInline):
    """Inline editor for department media"""
    model = DepartmentMedia
    extra = 1
    fields = ['file', 'media_type', 'alt_text', 'is_primary', 'order', 'preview']
    readonly_fields = ['preview']
    
    def preview(self, obj):
        """Show preview of media file"""
        if obj and obj.file:
            if obj.media_type == 'video':
                return format_html(
                    '<video width="100" height="100" controls><source src="{}" type="video/mp4"></video>',
                    obj.file.url
                )
            else:
                return format_html(
                    '<img src="{}" width="100" height="100" style="object-fit:cover; border-radius:4px;" />',
                    obj.file.url
                )
        return "No file"
    preview.short_description = "Preview"


class CategoryMediaInline(admin.TabularInline):
    """Inline editor for category media"""
    model = CategoryMedia
    extra = 1
    fields = ['file', 'media_type', 'alt_text', 'is_primary', 'order', 'preview']
    readonly_fields = ['preview']
    
    def preview(self, obj):
        """Show preview of media file"""
        if obj and obj.file:
            if obj.media_type == 'video':
                return format_html(
                    '<video width="100" height="100" controls><source src="{}" type="video/mp4"></video>',
                    obj.file.url
                )
            else:
                return format_html(
                    '<img src="{}" width="100" height="100" style="object-fit:cover; border-radius:4px;" />',
                    obj.file.url
                )
        return "No file"
    preview.short_description = "Preview"


class CategoryInline(admin.TabularInline):
    """Inline editor for categories within department"""
    model = Category
    extra = 1
    fields = ['name', 'slug', 'order', 'is_active']
    show_change_link = True


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'slug', 'order', 'is_active', 'media_count_display', 'product_count_display']
    list_filter = ['is_active']
    search_fields = ['name', 'slug', 'description']
    list_editable = ['order', 'is_active']
    prepopulated_fields = {'slug': ('name',)}
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'slug', 'description', 'order')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Statistics', {
            'fields': ('total_categories', 'total_products'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['total_categories', 'total_products']
    inlines = [DepartmentMediaInline, CategoryInline]
    
    def media_count_display(self, obj):
        """Display number of media files"""
        count = obj.media_files.count()
        color = '#2b6cb0' if count > 0 else '#a0aec0'
        return format_html(
            '<span style="color: {}; font-weight: bold;">📷 {}</span>',
            color,
            count
        )
    media_count_display.short_description = "Media Files"
    media_count_display.admin_order_field = 'media_files__count'
    
    def product_count_display(self, obj):
        """Display number of products"""
        count = Product.objects.filter(category__department=obj).count()
        color = '#38a169' if count > 0 else '#a0aec0'
        return format_html(
            '<span style="color: {}; font-weight: bold;">📦 {}</span>',
            color,
            count
        )
    product_count_display.short_description = "Products"
    product_count_display.admin_order_field = 'product_count'
    
    def total_categories(self, obj):
        return obj.categories.count()
    total_categories.short_description = "Total Categories"
    
    def total_products(self, obj):
        return Product.objects.filter(category__department=obj).count()
    total_products.short_description = "Total Products"
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.annotate(
            media_count=Count('media_files'),
            product_count=Count('categories__products', distinct=True)
        )


@admin.register(CategoryMedia)
class CategoryMediaAdmin(admin.ModelAdmin):
    list_display = ['id', 'category', 'media_type', 'is_primary', 'order', 'file_preview']
    list_filter = ['media_type', 'is_primary']
    search_fields = ['category__name', 'alt_text']
    list_editable = ['is_primary', 'order']
    
    def file_preview(self, obj):
        if obj and obj.file:
            if obj.media_type == 'video':
                return format_html(
                    '<video width="50" height="50" controls><source src="{}" type="video/mp4"></video>',
                    obj.file.url
                )
            else:
                return format_html(
                    '<img src="{}" width="50" height="50" style="object-fit:cover; border-radius:4px;" />',
                    obj.file.url
                )
        return "No file"
    file_preview.short_description = "Preview"


@admin.register(DepartmentMedia)
class DepartmentMediaAdmin(admin.ModelAdmin):
    list_display = ['id', 'department', 'media_type', 'is_primary', 'order', 'file_preview']
    list_filter = ['media_type', 'is_primary']
    search_fields = ['department__name', 'alt_text']
    list_editable = ['is_primary', 'order']
    
    def file_preview(self, obj):
        if obj and obj.file:
            if obj.media_type == 'video':
                return format_html(
                    '<video width="50" height="50" controls><source src="{}" type="video/mp4"></video>',
                    obj.file.url
                )
            else:
                return format_html(
                    '<img src="{}" width="50" height="50" style="object-fit:cover; border-radius:4px;" />',
                    obj.file.url
                )
        return "No file"
    file_preview.short_description = "Preview"


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'department', 'parent', 'order', 'is_active', 'product_count']
    list_filter = ['department', 'is_active']
    search_fields = ['name', 'slug', 'department__name']
    list_editable = ['order', 'is_active']
    prepopulated_fields = {'slug': ('name',)}
    inlines = [CategoryMediaInline]
    
    def product_count(self, obj):
        return obj.products.count()
    product_count.short_description = "Products"


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'slug', 'product_count']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    
    def product_count(self, obj):
        return obj.products.count()
    product_count.short_description = "Products"


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['id', 'product', 'user', 'rating', 'comment_preview', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['product__name', 'user__email', 'comment']
    readonly_fields = ['created_at']
    
    def comment_preview(self, obj):
        if obj and obj.comment:
            return obj.comment[:50] + '...' if len(obj.comment) > 50 else obj.comment
        return ""
    comment_preview.short_description = "Comment"


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'product', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__email', 'product__name']
    readonly_fields = ['created_at']