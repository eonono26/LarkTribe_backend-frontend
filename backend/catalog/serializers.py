from rest_framework import serializers
from .models import Department, Category, Brand, Product, ProductImage, BrandMedia, DepartmentMedia, CategoryMedia, ProductVariant, Review, Wishlist, AgeGroup, AgeGroupMedia, SizeGuide
from accounts.models import User


class DepartmentMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = DepartmentMedia
        fields = ['id', 'file', 'file_url', 'media_type', 'alt_text', 'is_primary', 'order', 'uploaded_at']
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class CategoryMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CategoryMedia
        fields = ['id', 'file', 'file_url', 'media_type', 'alt_text', 'is_primary', 'order', 'uploaded_at']
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class AgeGroupMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = AgeGroupMedia
        fields = ['id', 'file', 'file_url', 'media_type', 'alt_text', 'is_primary', 'order', 'uploaded_at']
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


# ============================================================
# DEPARTMENT SERIALIZER - UPDATED
# ============================================================

class DepartmentSerializer(serializers.ModelSerializer):
    media_files = DepartmentMediaSerializer(many=True, read_only=True)
    primary_image = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    videos = serializers.SerializerMethodField()
    category_count = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "order",
            "is_active",
            "media_files",
            "primary_image",
            "images",
            "videos",
            "category_count",
            "product_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
        ]

    def get_primary_image(self, obj):
        media = obj.primary_image

        if media:
            return DepartmentMediaSerializer(
                media,
                context=self.context
            ).data

        return None

    def get_images(self, obj):
        return DepartmentMediaSerializer(
            obj.images,
            many=True,
            context=self.context
        ).data

    def get_videos(self, obj):
        return DepartmentMediaSerializer(
            obj.videos,
            many=True,
            context=self.context
        ).data

    def get_category_count(self, obj):
        return obj.categories.filter(
            is_active=True
        ).count()

    def get_product_count(self, obj):
        return Product.objects.filter(
            category__department=obj,
            status=Product.Status.ACTIVE
        ).count()


# ============================================================
# CATEGORY CHILD SERIALIZER (shallow, for nested hierarchy output)
# ============================================================

class CategoryChildSerializer(serializers.ModelSerializer):
    """
    Minimal representation of a direct child category.

    Used to nest immediate children under their parent in
    CategorySerializer, e.g.:

        {
            "id": 1,
            "name": "Baby",
            "slug": "baby",
            "parent": null,
            "children": [
                {"id": 2, "name": "0-3 Months", "slug": "0-3-months"},
                {"id": 3, "name": "3-6 Months", "slug": "3-6-months"}
            ]
        }

    Deliberately shallow (no grandchildren, no media) to keep the
    hierarchy endpoint cheap — clients that need more detail can fetch
    the child category directly via its own id/slug.
    """

    class Meta:
        model = Category
        fields = ["id", "name", "slug"]


# ============================================================
# CATEGORY SERIALIZER - UPDATED
# ============================================================

class CategorySerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)

    media_files = CategoryMediaSerializer(
        many=True,
        read_only=True
    )

    primary_image = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    videos = serializers.SerializerMethodField()

    child_count = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()

    # Useful for frontend navigation
    is_leaf = serializers.SerializerMethodField()
    has_children = serializers.SerializerMethodField()

    # Immediate children, nested (id/name/slug only — see
    # CategoryChildSerializer). Lets the frontend render a category's
    # full hierarchy (e.g. Baby -> its 5 age-group subcategories) from a
    # single request instead of a second lookup per parent.
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category

        fields = [
            "id",
            "department",
            "parent",
            "name",
            "slug",
            "order",
            "description",
            "is_active",

            "media_files",
            "primary_image",
            "images",
            "videos",

            "child_count",
            "product_count",

            "is_leaf",
            "has_children",
            "children",

            "created_at",
            "updated_at",
        ]

    def get_primary_image(self, obj):
        media = obj.primary_image

        if media:
            return CategoryMediaSerializer(
                media,
                context=self.context
            ).data

        return None

    def get_images(self, obj):
        return CategoryMediaSerializer(
            obj.images,
            many=True,
            context=self.context
        ).data

    def get_videos(self, obj):
        return CategoryMediaSerializer(
            obj.videos,
            many=True,
            context=self.context
        ).data

    def get_child_count(self, obj):
        return obj.children.filter(
            is_active=True
        ).count()

    def get_product_count(self, obj):
        return obj.products.filter(
            status=Product.Status.ACTIVE
        ).count()

    def get_is_leaf(self, obj):
        return not obj.children.filter(
            is_active=True
        ).exists()

    def get_has_children(self, obj):
        return obj.children.filter(
            is_active=True
        ).exists()

    def get_children(self, obj):
        return CategoryChildSerializer(
            obj.children.filter(is_active=True).order_by("order"),
            many=True,
            context=self.context,
        ).data


# ============================================================
# AGE GROUP SERIALIZER - UPDATED
# ============================================================

class AgeGroupSerializer(serializers.ModelSerializer):
    media_files = AgeGroupMediaSerializer(
        many=True,
        read_only=True
    )

    primary_image = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    videos = serializers.SerializerMethodField()

    product_count = serializers.SerializerMethodField()

    # Frontend-friendly information
    stage_display = serializers.CharField(
        source="get_stage_display",
        read_only=True
    )

    class Meta:
        model = AgeGroup

        fields = [
            "id",
            "name",
            "slug",

            "stage",
            "stage_display",

            "min_age_years",
            "max_age_years",

            "icon",
            "order",
            "is_active",

            "media_files",
            "primary_image",
            "images",
            "videos",

            "product_count",

            "created_at",
        ]

        read_only_fields = [
            "created_at",
        ]

    def get_primary_image(self, obj):
        media = obj.media_files.filter(
            media_type="image",
            is_primary=True
        ).first()

        if media:
            return AgeGroupMediaSerializer(
                media,
                context=self.context
            ).data

        return None

    def get_images(self, obj):
        media = obj.media_files.filter(
            media_type="image"
        )

        return AgeGroupMediaSerializer(
            media,
            many=True,
            context=self.context
        ).data

    def get_videos(self, obj):
        media = obj.media_files.filter(
            media_type="video"
        )

        return AgeGroupMediaSerializer(
            media,
            many=True,
            context=self.context
        ).data

    def get_product_count(self, obj):
        return obj.products.filter(
            status=Product.Status.ACTIVE
        ).count()


class BrandMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = BrandMedia
        fields = ['id', 'file', 'file_url', 'media_type', 'alt_text', 'is_primary', 'order', 'uploaded_at']
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class BrandSerializer(serializers.ModelSerializer):
    media_files = BrandMediaSerializer(many=True, read_only=True)
    primary_image = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    videos = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Brand
        fields = [
            "id", "name", "slug", "logo", "logo_url", "description", 
            "website", "is_active", "media_files", "primary_image", 
            "images", "videos", "product_count", "created_at", "updated_at"
        ]
    
    def get_primary_image(self, obj):
        media = obj.primary_image
        if media:
            return BrandMediaSerializer(media, context=self.context).data
        return None
    
    def get_images(self, obj):
        media = obj.images
        return BrandMediaSerializer(media, many=True, context=self.context).data
    
    def get_videos(self, obj):
        media = obj.videos
        return BrandMediaSerializer(media, many=True, context=self.context).data
    
    def get_product_count(self, obj):
        """Get the number of products for this brand"""
        return obj.products.filter(status=Product.Status.ACTIVE).count()
    
    def get_logo_url(self, obj):
        """Get the absolute URL of the brand logo"""
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None

class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ["id", "image", "image_url", "alt_text", "color", "order"]

    def get_image_url(self, obj):
        """Get the absolute URL of the product image"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None



class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ["id", "size", "color", "stock", "sku_suffix"]


class SizeGuideSerializer(serializers.ModelSerializer):
    class Meta:
        model = SizeGuide
        fields = ["id", "name", "guide_type", "columns", "rows", "notes"]


class ReviewSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="user",
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Review
        fields = ["id", "user", "user_id", "rating", "comment", "created_at"]
        read_only_fields = ["user", "created_at"]


# ============================================================
# PRODUCT LIST SERIALIZER - UPDATED
# ============================================================

class ProductListSerializer(serializers.ModelSerializer):
    """
    Lightweight product serializer used by product grids.

    Includes gender and age groups so the frontend always knows
    why the product belongs to the selected Baby Boys/Girls
    and age section. Also includes colors and color_images so the
    grid's color swatches can swap the displayed photo without a
    second request per product.
    """

    image = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()

    colors = serializers.SerializerMethodField()
    color_images = serializers.SerializerMethodField()
    color_variant_ids = serializers.SerializerMethodField()
    needs_size = serializers.SerializerMethodField()

    vendor_name = serializers.CharField(
        source="vendor.store_name",
        read_only=True
    )

    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    category_slug = serializers.CharField(
        source="category.slug",
        read_only=True
    )

    department_name = serializers.CharField(
        source="category.department.name",
        read_only=True
    )

    department_slug = serializers.CharField(
        source="category.department.slug",
        read_only=True
    )

    discount_percent = serializers.IntegerField(
        read_only=True
    )

    price_display = serializers.SerializerMethodField()

    gender_display = serializers.CharField(
        source="get_gender_display",
        read_only=True
    )

    age_groups = AgeGroupSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Product

        fields = [
            "id",
            "name",
            "slug",

            "price",
            "price_display",
            "compare_at_price",
            "discount_percent",

            "rating_avg",
            "rating_count",

            "image",
            "image_url",
            "images",

            "colors",
            "color_images",
            "color_variant_ids",
            "needs_size",

            "vendor_name",

            "category_name",
            "category_slug",

            "department_name",
            "department_slug",

            "is_featured",

            "stock",
            "status",

            "created_at",

            "gender",
            "gender_display",

            "age_groups",
        ]

    def get_image(self, obj):
        first = obj.images.first()

        if first and first.image:
            return first.image.url

        return None

    def get_image_url(self, obj):
        first = obj.images.first()

        if first and first.image:
            request = self.context.get("request")

            if request:
                return request.build_absolute_uri(
                    first.image.url
                )

            return first.image.url

        return None

    def get_images(self, obj):
        request = self.context.get("request")

        images_data = []

        for img in obj.images.all().order_by("order"):

            if not img.image:
                continue

            image_url = img.image.url

            if request:
                image_url = request.build_absolute_uri(
                    img.image.url
                )

            images_data.append({
                "id": img.id,
                "image": image_url,
                "alt_text": img.alt_text,
                "color": img.color,
                "order": img.order,
            })

        return images_data

    def get_colors(self, obj):
        """Distinct colors from this product's variants, in the order
        they were created. Only colors with an actual variant count —
        keeps the swatch row from showing a color nobody can buy."""
        seen = set()
        ordered = []

        for v in obj.variants.exclude(color="").order_by("id"):
            if v.color not in seen:
                seen.add(v.color)
                ordered.append(v.color)

        return ordered

    def get_color_images(self, obj):
        """color -> absolute image URL, for the first color-tagged photo
        of each color. Colors with no dedicated photo yet are simply
        absent from this dict — the frontend falls back to the default
        image for those."""
        request = self.context.get("request")
        mapping = {}

        for img in obj.images.exclude(color="").order_by("order"):
            if img.color in mapping or not img.image:
                continue

            image_url = img.image.url

            if request:
                image_url = request.build_absolute_uri(img.image.url)

            mapping[img.color] = image_url

        return mapping

    def get_color_variant_ids(self, obj):
        """color -> a representative ProductVariant id for that color,
        preferring one that's in stock. Lets grid/editorial cards' color
        swatches and "Quick Add" resolve a real variant to add to the cart
        without opening the full product page (where an exact size is
        picked instead)."""
        best = {}

        for v in obj.variants.exclude(color=""):
            current = best.get(v.color)
            if current is None or (v.stock > 0 and current.stock <= 0):
                best[v.color] = v

        return {color: v.id for color, v in best.items()}

    def get_needs_size(self, obj):
        """True when the shopper has to pick a size, so grid cards send
        'Quick Add' through Quick View instead of guessing a size."""
        return any(v.size for v in obj.variants.all())

    def get_price_display(self, obj):
        return f"KSh {obj.price:,.0f}"

        

# ============================================================
# PRODUCT DETAIL SERIALIZER - UPDATED
# ============================================================

class ProductDetailSerializer(serializers.ModelSerializer):

    images = serializers.SerializerMethodField()

    variants = ProductVariantSerializer(
        many=True,
        read_only=True
    )

    reviews = serializers.SerializerMethodField()

    category = CategorySerializer(
        read_only=True
    )

    brand = BrandSerializer(
        read_only=True
    )

    vendor_name = serializers.CharField(
        source="vendor.store_name",
        read_only=True
    )

    vendor_id = serializers.IntegerField(
        source="vendor.id",
        read_only=True
    )

    department = serializers.SerializerMethodField()

    price_display = serializers.SerializerMethodField()

    discount_percent = serializers.IntegerField(
        read_only=True
    )

    review_summary = serializers.SerializerMethodField()

    is_in_stock = serializers.SerializerMethodField()

    age_groups = AgeGroupSerializer(
        many=True,
        read_only=True
    )

    available_sizes = serializers.SerializerMethodField()

    gender_display = serializers.CharField(
        source="get_gender_display",
        read_only=True
    )

    size_guide = SizeGuideSerializer(
        read_only=True
    )

    class Meta:
        model = Product

        fields = [
            "id",
            "name",
            "slug",
            "description",
            "features",
            "materials",
            "care_instructions",
            "size_guide",

            "price",
            "price_display",
            "compare_at_price",
            "discount_percent",

            "stock",
            "is_in_stock",

            "sku",
            "status",

            "rating_avg",
            "rating_count",
            "review_summary",

            "category",
            "brand",

            "vendor_name",
            "vendor_id",

            "department",

            "images",
            "variants",
            "available_sizes",

            "reviews",

            "created_at",
            "updated_at",

            "is_featured",

            "gender",
            "gender_display",

            "age_groups",
        ]

    def get_available_sizes(self, obj):
        sizes = (
            obj.variants
            .filter(stock__gt=0)
            .exclude(size="")
            .values_list("size", flat=True)
        )

        seen = set()
        ordered = []

        for size in sizes:

            if size not in seen:
                seen.add(size)
                ordered.append(size)

        return ordered

    def get_images(self, obj):
        request = self.context.get("request")

        data = []

        for img in obj.images.all().order_by("order"):

            if not img.image:
                continue

            image_url = img.image.url

            if request:
                image_url = request.build_absolute_uri(
                    img.image.url
                )

            data.append({
                "id": img.id,
                "image": image_url,
                "alt_text": img.alt_text,
                # Which color this photo shows ("" = general shot). The product
                # page uses it to swap the gallery when a swatch is clicked.
                "color": img.color,
                "order": img.order,
            })

        return data

    def get_department(self, obj):
        if obj.category and obj.category.department:
            return DepartmentSerializer(
                obj.category.department,
                context=self.context
            ).data

        return None

    def get_reviews(self, obj):
        reviews = obj.reviews.all()[:10]

        return ReviewSerializer(
            reviews,
            many=True
        ).data

    def get_review_summary(self, obj):

        reviews = obj.reviews.all()

        if not reviews.exists():
            return None

        distribution = {}

        for rating in range(1, 6):
            distribution[rating] = reviews.filter(
                rating=rating
            ).count()

        total = reviews.count()

        return {
            "total": total,
            "average": obj.rating_avg,
            "distribution": distribution,
            "percent_recommend": round(
                (
                    reviews.filter(
                        rating__gte=4
                    ).count() / total
                ) * 100
            ) if total else 0,
        }

    def get_price_display(self, obj):
        return f"KSh {obj.price:,.0f}"

    def get_is_in_stock(self, obj):
        return obj.stock > 0


# ============================================================
# PRODUCT WRITE SERIALIZER - UPDATED
# ============================================================

class ProductWriteSerializer(serializers.ModelSerializer):
    """
    Vendor product creation/update.

    Vendor selects:

        Category
        Gender
        Age Groups

    Example:

        Category = Baby / Dresses
        Gender = Girls
        Age Groups = 6–12 Months, 12–24 Months
    """

    images = ProductImageSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Product

        fields = [
            "id",

            "category",
            "brand",

            "name",
            "description",
            "features",

            "price",
            "compare_at_price",

            "stock",
            "sku",

            "status",

            "images",

            "is_featured",

            "age_groups",
            "gender",
        ]

        read_only_fields = [
            "id",
        ]

    def validate_status(self, value):
        """
        Vendors cannot self-approve products.
        """

        return Product.Status.PENDING

    def validate_price(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Price must be greater than 0."
            )

        return value

    def validate_stock(self, value):

        if value < 0:
            raise serializers.ValidationError(
                "Stock cannot be negative."
            )

        return value

    def validate(self, data):

        compare_at_price = data.get(
            "compare_at_price"
        )

        price = data.get("price")

        if (
            compare_at_price is not None
            and price is not None
            and compare_at_price <= price
        ):
            raise serializers.ValidationError({
                "compare_at_price":
                    "Compare at price must be greater than price."
            })

        return data


class WishlistSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(status=Product.Status.ACTIVE), 
        source="product", 
        write_only=True
    )
    added_at = serializers.DateTimeField(source="created_at", read_only=True)
    
    class Meta:
        model = Wishlist
        fields = ["id", "product", "product_id", "added_at", "created_at"]
        read_only_fields = ["created_at"]


# Additional serializers for admin and bulk operations
class ProductAdminSerializer(serializers.ModelSerializer):
    """Serializer for admin panel with full access"""
    vendor_name = serializers.CharField(source="vendor.store_name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    image_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]
    
    def get_image_count(self, obj):
        return obj.images.count()


class DepartmentAdminSerializer(serializers.ModelSerializer):
    """Serializer for admin panel with full access"""
    category_count = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]
    
    def get_category_count(self, obj):
        return obj.categories.count()
    
    def get_product_count(self, obj):
        return Product.objects.filter(category__department=obj).count()


class CategoryAdminSerializer(serializers.ModelSerializer):
    """Serializer for admin panel with full access"""
    department_name = serializers.CharField(source="department.name", read_only=True)
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]
    
    def get_product_count(self, obj):
        return obj.products.count()