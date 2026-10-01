from django import forms
from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from .models import (
    Department, Category, Brand, BrandMedia, Product, ProductImage,
    ProductVariant, Review, Wishlist, DepartmentMedia, CategoryMedia,
    AgeGroup, AgeGroupMedia, SizeGuide
)


class ProductImageForm(forms.ModelForm):
    """Restricts the color field to colors that actually exist as
    variants on this product, so it can never drift out of sync with
    ProductVariant.color (e.g. 'Black' vs 'black' silently breaking
    the storefront's color_images lookup)."""

    class Meta:
        model = ProductImage
        fields = ['image', 'color', 'alt_text', 'order']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._set_color_choices()

    def _set_color_choices(self):
        product = getattr(self, '_parent_product', None) or getattr(self.instance, 'product', None)

        colors = []
        if product and product.pk:
            colors = list(
                product.variants
                .exclude(color='')
                .values_list('color', flat=True)
                .distinct()
                .order_by('color')
            )

        choices = [('', '— General / no specific color —')] + [(c, c) for c in colors]
        self.fields['color'] = forms.ChoiceField(choices=choices, required=False)


class ProductImageInline(admin.TabularInline):
    """Inline editor for product images"""
    model = ProductImage
    form = ProductImageForm
    extra = 1
    fields = ['image', 'color', 'alt_text', 'order', 'image_preview']
    readonly_fields = ['image_preview']

    def image_preview(self, obj):
        if obj and obj.image:
            return format_html(
                '<img src="{}" width="80" height="80" style="object-fit:cover; border-radius:4px;" />',
                obj.image.url
            )
        return "No image"
    image_preview.short_description = "Preview"

    def get_formset(self, request, obj=None, **kwargs):
        """Passes the parent Product (obj) down to each row's form so the
        color dropdown can be built from that product's variants, even for
        new/unsaved image rows that have no obj.product yet."""
        formset = super().get_formset(request, obj, **kwargs)
        parent_product = obj

        class ProductImageFormSetWithParent(formset):
            def _construct_form(self, i, **fkwargs):
                form = super()._construct_form(i, **fkwargs)
                form._parent_product = parent_product
                form._set_color_choices()
                return form

        return ProductImageFormSetWithParent

        

class ProductVariantInline(admin.TabularInline):
    """Inline editor for product variants"""
    model = ProductVariant
    extra = 1
    fields = ['size', 'color', 'stock', 'sku_suffix']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'name', 'vendor', 'category', 'gender', 'price', 'stock',
        'status', 'is_featured', 'image_preview', 'rating_display'
    ]
    list_filter = ['status', 'category__department', 'gender', 'age_groups', 'is_featured', 'vendor']
    search_fields = ['name', 'sku', 'vendor__store_name']
    list_editable = ['price', 'stock', 'status', 'is_featured']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at', 'updated_at', 'rating_avg', 'rating_count']
    inlines = [ProductImageInline, ProductVariantInline]
    filter_horizontal = ['age_groups']
    actions = ["approve_products", "reject_products"]
    fieldsets = (
        ('Basic Information', {
            'fields': ('vendor', 'category', 'brand', 'name', 'slug', 'description', 'features'),
        }),
        ('Materials, Care & Sizing', {
            'fields': ('materials', 'care_instructions', 'size_guide'),
            'description': (
                "'Materials' shows as a short line under Materials & Care on the "
                "product page (e.g. 'Nylon, Rubber'). Pick a Size Guide (create one "
                "under Catalog → Size guides if needed — one per type, e.g. Shoes, "
                "Clothes) to show a size chart next to the size selector."
            ),
        }),
        ('Shopping Flow (Gender & Age)', {
            'fields': ('gender', 'age_groups'),
            'description': (
                "This is how the product is reached through the Kids → Baby → "
                "Boys/Girls → Age → Category flow. Gender and age groups are "
                "filters on the product — do not create separate categories "
                "like \"Baby Girls\" or \"Baby Boys\"."
            ),
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


@admin.register(SizeGuide)
class SizeGuideAdmin(admin.ModelAdmin):
    """
    Admin-managed size charts (e.g. one for Shoes, one for Clothes).
    Attach a guide to a product from the Product edit page
    (Materials, Care & Sizing section).

    'Columns' and 'Rows' are simple JSON, e.g.:

        Columns: ["Size", "EU", "UK", "US", "Foot length (cm)"]
        Rows: [["36", "36", "3.5", "6", "22.9"], ["37", "37", "4", "6.5", "23.5"]]
    """
    list_display = ['name', 'guide_type', 'product_count', 'updated_at']
    list_filter = ['guide_type']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        (None, {'fields': ('name', 'guide_type')}),
        ('Table', {
            'fields': ('columns', 'rows'),
            'description': "Columns is a flat list of header labels. Rows is a list of lists (one list per row, values in the same order as Columns).",
        }),
        ('Notes', {'fields': ('notes',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def product_count(self, obj):
        return obj.products.count()
    product_count.short_description = "Products using this guide"


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


class AgeGroupMediaInline(admin.TabularInline):
    """Inline editor for age group media"""
    model = AgeGroupMedia
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


class BrandMediaInline(admin.TabularInline):
    """Inline for brand media in brand admin"""
    model = BrandMedia
    extra = 1
    fields = ['file', 'media_type', 'alt_text', 'is_primary', 'order']
    show_change_link = True


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ['id', 'brand_thumbnail', 'name', 'slug', 'product_count', 'is_active', 'created_at']
    list_display_links = ['id', 'name']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'slug', 'description']
    prepopulated_fields = {'slug': ('name',)}
    list_per_page = 25
    readonly_fields = ['created_at', 'updated_at', 'product_count_display', 'media_count_display', 'logo_preview']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'slug', 'description', 'website', 'is_active')
        }),
        ('Brand Identity', {
            'fields': ('logo', 'logo_preview')
        }),
        ('Media', {
            'fields': ('media_count_display',)
        }),
        ('Statistics', {
            'fields': ('product_count_display',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    inlines = [BrandMediaInline]
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.annotate(
            total_products=Count('products', distinct=True),
            total_media=Count('media_files', distinct=True)
        )
    
    def brand_thumbnail(self, obj):
        if obj.logo:
            return format_html(
                '<img src="{}" width="50" height="50" style="object-fit:contain; border-radius:4px;" />',
                obj.logo.url
            )
        primary_media = obj.primary_image
        if primary_media and primary_media.file:
            return format_html(
                '<img src="{}" width="50" height="50" style="object-fit:contain; border-radius:4px;" />',
                primary_media.file.url
            )
        return format_html(
            '<div style="width:50px;height:50px;display:flex;align-items:center;justify-content:center;background:#f0f0f0;border-radius:4px;font-size:20px;color:#999;">{}</div>',
            obj.name[0].upper() if obj.name else '?'
        )
    brand_thumbnail.short_description = 'Logo'
    brand_thumbnail.allow_tags = True
    
    def logo_preview(self, obj):
        if obj and obj.logo:
            return format_html(
                '<img src="{}" width="200" style="max-height:150px; object-fit:contain; border:1px solid #ddd; border-radius:8px; padding:8px;" />',
                obj.logo.url
            )
        return format_html('<span style="color:#999;">No logo uploaded</span>')
    logo_preview.short_description = 'Logo Preview'
    logo_preview.allow_tags = True
    
    def product_count(self, obj):
        return getattr(obj, 'total_products', obj.products.count())
    product_count.short_description = "Products"
    product_count.admin_order_field = 'total_products'
    
    def product_count_display(self, obj):
        active_count = obj.products.filter(status='active').count()
        pending_count = obj.products.filter(status='pending').count()
        total_count = obj.products.count()
        return format_html(
            '<div style="display:flex; gap:12px;">'
            '<span><strong>Total:</strong> {}</span>'
            '<span><strong>Active:</strong> {}</span>'
            '<span><strong>Pending:</strong> {}</span>'
            '</div>',
            total_count, active_count, pending_count
        )
    product_count_display.short_description = "Product Statistics"
    product_count_display.allow_tags = True
    
    def media_count_display(self, obj):
        media_count = obj.media_files.count()
        if media_count == 0:
            return format_html('<span style="color:#999;">No media uploaded</span>')
        
        preview_html = '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">'
        for media in obj.media_files.all()[:4]:
            if media.file and media.media_type == 'image':
                preview_html += format_html(
                    '<img src="{}" width="80" height="80" style="object-fit:cover; border-radius:4px; border:1px solid #ddd;" />',
                    media.file.url
                )
            elif media.file and media.media_type == 'video':
                preview_html += format_html(
                    '<div style="width:80px;height:80px;display:flex;align-items:center;justify-content:center;background:#f0f0f0;border-radius:4px;border:1px solid #ddd;font-size:12px;color:#666;">🎬 Video</div>'
                )
        if media_count > 4:
            preview_html += format_html(
                '<div style="width:80px;height:80px;display:flex;align-items:center;justify-content:center;background:#f5f5f5;border-radius:4px;border:1px solid #ddd;font-size:14px;font-weight:bold;color:#999;">+{}</div>',
                media_count - 4
            )
        preview_html += '</div>'
        
        return format_html(
            '<div><strong>{} media file(s)</strong>{}</div>',
            media_count, preview_html
        )
    media_count_display.short_description = "Media"
    media_count_display.allow_tags = True
    
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
    
    def delete_queryset(self, request, queryset):
        for brand in queryset:
            if brand.logo:
                brand.logo.delete(save=False)
            for media in brand.media_files.all():
                if media.file:
                    media.file.delete(save=False)
        super().delete_queryset(request, queryset)
        

@admin.register(BrandMedia)
class BrandMediaAdmin(admin.ModelAdmin):
    list_display = ['id', 'brand', 'media_preview', 'media_type', 'is_primary', 'order', 'uploaded_at']
    list_filter = ['media_type', 'is_primary', 'brand']
    search_fields = ['brand__name', 'alt_text']
    list_per_page = 25
    readonly_fields = ['uploaded_at', 'file_preview']
    fieldsets = (
        ('Media Information', {
            'fields': ('brand', 'file', 'file_preview', 'media_type', 'alt_text')
        }),
        ('Display Settings', {
            'fields': ('is_primary', 'order')
        }),
        ('Timestamps', {
            'fields': ('uploaded_at',),
            'classes': ('collapse',)
        }),
    )
    
    def media_preview(self, obj):
        if obj.file and obj.media_type == 'image':
            return format_html(
                '<img src="{}" width="60" height="60" style="object-fit:cover; border-radius:4px;" />',
                obj.file.url
            )
        elif obj.file and obj.media_type == 'video':
            return format_html(
                '<div style="width:60px;height:60px;display:flex;align-items:center;justify-content:center;background:#f0f0f0;border-radius:4px;font-size:24px;">🎬</div>'
            )
        return format_html('<span style="color:#999;">No file</span>')
    media_preview.short_description = 'Preview'
    media_preview.allow_tags = True
    
    def file_preview(self, obj):
        if obj.file and obj.media_type == 'image':
            return format_html(
                '<img src="{}" width="300" style="max-height:300px; object-fit:contain; border:1px solid #ddd; border-radius:8px; padding:8px;" />',
                obj.file.url
            )
        elif obj.file and obj.media_type == 'video':
            return format_html(
                '<video width="300" controls style="border-radius:8px; border:1px solid #ddd;">'
                '<source src="{}" type="video/mp4">'
                'Your browser does not support the video tag.'
                '</video>',
                obj.file.url
            )
        return format_html('<span style="color:#999;">No file uploaded</span>')
    file_preview.short_description = 'Preview'
    file_preview.allow_tags = True
    
    def save_model(self, request, obj, form, change):
        if obj.is_primary:
            BrandMedia.objects.filter(brand=obj.brand).exclude(id=obj.id).update(is_primary=False)
        super().save_model(request, obj, form, change)
    
    def delete_model(self, request, obj):
        if obj.file:
            obj.file.delete(save=False)
        super().delete_model(request, obj)


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


# ==============================================================
# AgeGroupAdmin
# ==============================================================
@admin.register(AgeGroup)
class AgeGroupAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "slug",
        "stage",
        "icon",
        "age_range_display",
        "order",
        "is_active",
        "media_count_display",
        "product_count",
    ]

    list_editable = [
        "icon",
        "order",
        "is_active",
    ]

    prepopulated_fields = {
        "slug": ("name",),
    }

    search_fields = [
        "name",
        "slug",
    ]

    list_filter = [
        "stage",
        "is_active",
    ]

    ordering = [
        "stage",
        "order",
    ]

    inlines = [
        AgeGroupMediaInline,
    ]

    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "name",
                    "slug",
                    "icon",
                    "order",
                    "is_active",
                )
            },
        ),
        (
            "Stage",
            {
                "fields": ("stage",),
                "description": (
                    "General age stage used by the frontend to group age "
                    "groups under Baby / Kids / Teens navigation. This is "
                    "age-only — gender lives on Product, not here."
                ),
            },
        ),
        (
            "Age Range",
            {
                "fields": (
                    "min_age_years",
                    "max_age_years",
                ),
                "description": (
                    "Define the actual age range. "
                    "For example, Baby = 0–2 years and "
                    "Toddler = 2–4 years."
                ),
            },
        ),
    )

    def age_range_display(self, obj):
        """Display the age range in a friendly format."""

        if obj.max_age_years is not None:
            return format_html(
                '<span style="font-weight: 600;">{}–{} years</span>',
                obj.min_age_years,
                obj.max_age_years,
            )

        return format_html(
            '<span style="font-weight: 600;">{}+ years</span>',
            obj.min_age_years,
        )

    age_range_display.short_description = "Age Range"
    age_range_display.admin_order_field = "min_age_years"

    def media_count_display(self, obj):
        """Display the number of media files."""

        count = obj.total_media

        if count > 0:
            return format_html(
                '<span style="color: #2b6cb0; font-weight: 600;">'
                '📷 {}'
                "</span>",
                count,
            )

        return format_html(
            '<span style="color: #a0aec0;">📷 0</span>'
        )

    media_count_display.short_description = "Media Files"
    media_count_display.admin_order_field = "total_media"

    def product_count(self, obj):
        """Display number of products assigned to this age group."""

        count = obj.total_products

        if count > 0:
            return format_html(
                '<span style="font-weight: 600;">{}</span>',
                count,
            )

        return format_html(
            '<span style="color: #a0aec0;">0</span>'
        )

    product_count.short_description = "Products"
    product_count.admin_order_field = "total_products"

    def get_queryset(self, request):
        """Load product/media counts efficiently."""

        queryset = super().get_queryset(request)

        return queryset.annotate(
            total_products=Count(
                "products",
                distinct=True,
            ),
            total_media=Count(
                "media_files",
                distinct=True,
            ),
        )

    def delete_queryset(self, request, queryset):
        """
        Delete physical media files before deleting age groups.
        """

        for age_group in queryset:
            for media in age_group.media_files.all():
                if media.file:
                    media.file.delete(save=False)

        super().delete_queryset(request, queryset)