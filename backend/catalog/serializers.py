from rest_framework import serializers
from .models import Department, Category, Brand, Product, ProductImage, DepartmentMedia,CategoryMedia, ProductVariant, Review, Wishlist
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
            'id', 'name', 'slug', 'description', 'order', 'is_active',
            'media_files', 'primary_image', 'images', 'videos',
            'category_count', 'product_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_primary_image(self, obj):
        media = obj.primary_image
        if media:
            return DepartmentMediaSerializer(media, context=self.context).data
        return None
    
    def get_images(self, obj):
        media = obj.images
        return DepartmentMediaSerializer(media, many=True, context=self.context).data
    
    def get_videos(self, obj):
        media = obj.videos
        return DepartmentMediaSerializer(media, many=True, context=self.context).data
    
    def get_category_count(self, obj):
        return obj.categories.count()
    
    def get_product_count(self, obj):
        return Product.objects.filter(category__department=obj, status=Product.Status.ACTIVE).count()


class CategorySerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    media_files = CategoryMediaSerializer(many=True, read_only=True)
    primary_image = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    videos = serializers.SerializerMethodField()
    child_count = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = [
            'id', 'department', 'parent', 'name', 'slug', 'order',
            'description', 'is_active', 'media_files', 'primary_image',
            'images', 'videos', 'child_count', 'product_count',
            'created_at', 'updated_at'
        ]
    
    def get_primary_image(self, obj):
        media = obj.primary_image
        if media:
            return CategoryMediaSerializer(media, context=self.context).data
        return None
    
    def get_images(self, obj):
        media = obj.images
        return CategoryMediaSerializer(media, many=True, context=self.context).data
    
    def get_videos(self, obj):
        media = obj.videos
        return CategoryMediaSerializer(media, many=True, context=self.context).data
    
    def get_child_count(self, obj):
        return obj.children.count()
    
    def get_product_count(self, obj):
        return obj.products.filter(status=Product.Status.ACTIVE).count()




class BrandSerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Brand
        fields = ["id", "name", "slug", "product_count"]
    
    def get_product_count(self, obj):
        """Get the number of products for this brand"""
        return obj.products.filter(status=Product.Status.ACTIVE).count()


class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductImage
        fields = ["id", "image", "image_url", "alt_text", "order"]
    
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


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for grid/listing views."""
    image = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    vendor_name = serializers.CharField(source="vendor.store_name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    department_name = serializers.CharField(source="category.department.name", read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)
    price_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "price", "price_display", "compare_at_price", 
            "discount_percent", "rating_avg", "rating_count", "image", "image_url",
            "vendor_name", "category_name", "department_name", "is_featured",
            "stock", "status", "created_at"
        ]

    def get_image(self, obj):
        """Get the image URL string for the first product image"""
        first = obj.images.first()
        if first and first.image:
            # Return the URL as a string, not the ImageFieldFile object
            return first.image.url
        return None
    
    def get_image_url(self, obj):
        """Get the absolute URL of the first product image"""
        first = obj.images.first()
        if first and first.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first.image.url)
            return first.image.url
        return None
    
    def get_price_display(self, obj):
        """Format price for display"""
        return f"${obj.price:.2f}"


class ProductDetailSerializer(serializers.ModelSerializer):
    images = serializers.SerializerMethodField()
    variants = ProductVariantSerializer(many=True, read_only=True)
    reviews = serializers.SerializerMethodField()
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    vendor_name = serializers.CharField(source="vendor.store_name", read_only=True)
    vendor_id = serializers.IntegerField(source="vendor.id", read_only=True)
    department = serializers.SerializerMethodField()
    price_display = serializers.SerializerMethodField()
    discount_percent = serializers.IntegerField(read_only=True)
    review_summary = serializers.SerializerMethodField()
    is_in_stock = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "description", "price", "price_display", 
            "compare_at_price", "discount_percent", "stock", "is_in_stock",
            "sku", "status", "rating_avg", "rating_count", "review_summary",
            "category", "brand", "vendor_name", "vendor_id", "department",
            "images", "variants", "reviews", "created_at", "updated_at",
            "is_featured"
        ]
    
    def get_images(self, obj):
        """Return image data as dictionaries with URL strings"""
        return [
            {
                'id': img.id,
                'image': img.image.url if img.image else None,
                'image_url': self.context.get('request').build_absolute_uri(img.image.url) if img.image and self.context.get('request') else (img.image.url if img.image else None),
                'alt_text': img.alt_text,
                'order': img.order
            }
            for img in obj.images.all()
        ]
    
    def get_department(self, obj):
        """Get the department of the product"""
        if obj.category and obj.category.department:
            return DepartmentSerializer(obj.category.department, context=self.context).data
        return None
    
    def get_reviews(self, obj):
        """Get all reviews with pagination"""
        reviews = obj.reviews.all()[:10]  # Limit to 10 recent reviews
        return ReviewSerializer(reviews, many=True).data
    
    def get_review_summary(self, obj):
        """Get review summary statistics"""
        reviews = obj.reviews.all()
        if reviews.exists():
            rating_distribution = {}
            for i in range(1, 6):
                rating_distribution[i] = reviews.filter(rating=i).count()
            
            return {
                "total": reviews.count(),
                "average": obj.rating_avg,
                "distribution": rating_distribution,
                "percent_recommend": round((reviews.filter(rating__gte=4).count() / reviews.count()) * 100) if reviews.count() > 0 else 0
            }
        return None
    
    def get_price_display(self, obj):
        """Format price for display"""
        return f"${obj.price:.2f}"
    
    def get_is_in_stock(self, obj):
        """Check if product is in stock"""
        return obj.stock > 0


class ProductWriteSerializer(serializers.ModelSerializer):
    """Used by vendors to create/update their own products."""
    images = ProductImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Product
        fields = [
            "id", "category", "brand", "name", "description", "price", 
            "compare_at_price", "stock", "sku", "status", "images",
            "is_featured"
        ]
        read_only_fields = ["id"]

    def validate_status(self, value):
        """Vendors cannot self-approve; forced to pending on create/edit"""
        if value != Product.Status.PENDING:
            return Product.Status.PENDING
        return value
    
    def validate_price(self, value):
        """Validate price is positive"""
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0")
        return value
    
    def validate_stock(self, value):
        """Validate stock is non-negative"""
        if value < 0:
            raise serializers.ValidationError("Stock cannot be negative")
        return value
    
    def validate(self, data):
        """Validate compare_at_price is greater than price if provided"""
        if data.get('compare_at_price') and data.get('price'):
            if data['compare_at_price'] <= data['price']:
                raise serializers.ValidationError({
                    'compare_at_price': 'Compare at price must be greater than price'
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