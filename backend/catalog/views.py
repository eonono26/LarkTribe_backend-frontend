from rest_framework import viewsets, generics, permissions, filters, status, parsers
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg, F, Value, Case, When, DecimalField
from django.db.models.functions import Round
from django.shortcuts import get_object_or_404
from .models import Department, Category, Brand, Product, ProductImage, Review, Wishlist, DepartmentMedia, CategoryMedia, AgeGroup, AgeGroupMedia
from .serializers import (
    DepartmentSerializer, CategorySerializer, BrandSerializer,
    ProductListSerializer, ProductDetailSerializer, ProductWriteSerializer,
    ProductImageSerializer, ReviewSerializer, WishlistSerializer,
    DepartmentAdminSerializer, CategoryAdminSerializer, ProductAdminSerializer,
    DepartmentMediaSerializer, CategoryMediaSerializer, AgeGroupSerializer,
    AgeGroupMediaSerializer, BrandMediaSerializer
)
from .permissions import IsOwnerVendorOrReadOnly
from .filters import ProductFilter


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return u.is_authenticated and (u.is_staff or getattr(u, "role", None) == "admin")


class DepartmentMediaViewSet(viewsets.ModelViewSet):
    """View for managing department media"""
    serializer_class = DepartmentMediaSerializer
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]
    
    def get_queryset(self):
        department_id = self.kwargs.get('department_pk')
        if department_id:
            return DepartmentMedia.objects.filter(department_id=department_id)
        return DepartmentMedia.objects.none()
    
    def perform_create(self, serializer):
        department = get_object_or_404(Department, id=self.kwargs['department_pk'])
        media_type = self.request.data.get('media_type', 'image')
        
        is_primary = self.request.data.get('is_primary', False)
        if is_primary or not department.media_files.exists():
            department.media_files.update(is_primary=False)
            is_primary = True
        
        serializer.save(
            department=department,
            media_type=media_type,
            is_primary=is_primary,
            order=department.media_files.count()
        )
    
    @action(detail=True, methods=['post'])
    def set_primary(self, request, department_pk=None, pk=None):
        """Set a media file as primary"""
        media = self.get_object()
        department = media.department
        
        department.media_files.update(is_primary=False)
        media.is_primary = True
        media.save()
        
        return Response({'message': 'Primary media set successfully'})


class CategoryMediaViewSet(viewsets.ModelViewSet):
    """View for managing category media"""
    serializer_class = CategoryMediaSerializer
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]
    
    def get_queryset(self):
        category_id = self.kwargs.get('category_pk')
        if category_id:
            return CategoryMedia.objects.filter(category_id=category_id)
        return CategoryMedia.objects.none()
    
    def perform_create(self, serializer):
        category = get_object_or_404(Category, id=self.kwargs['category_pk'])
        media_type = self.request.data.get('media_type', 'image')
        
        is_primary = self.request.data.get('is_primary', False)
        if is_primary or not category.media_files.exists():
            category.media_files.update(is_primary=False)
            is_primary = True
        
        serializer.save(
            category=category,
            media_type=media_type,
            is_primary=is_primary,
            order=category.media_files.count()
        )
    
    @action(detail=True, methods=['post'])
    def set_primary(self, request, category_pk=None, pk=None):
        """Set a media file as primary"""
        media = self.get_object()
        category = media.category
        
        category.media_files.update(is_primary=False)
        media.is_primary = True
        media.save()
        
        return Response({'message': 'Primary media set successfully'})


class AgeGroupMediaViewSet(viewsets.ModelViewSet):
    """View for managing age group media"""
    serializer_class = AgeGroupMediaSerializer
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]
    
    def get_queryset(self):
        age_group_id = self.kwargs.get('age_group_pk')
        if age_group_id:
            return AgeGroupMedia.objects.filter(age_group_id=age_group_id)
        return AgeGroupMedia.objects.none()
    
    def perform_create(self, serializer):
        age_group = get_object_or_404(AgeGroup, id=self.kwargs['age_group_pk'])
        media_type = self.request.data.get('media_type', 'image')
        
        is_primary = self.request.data.get('is_primary', False)
        if is_primary or not age_group.media_files.exists():
            age_group.media_files.update(is_primary=False)
            is_primary = True
        
        serializer.save(
            age_group=age_group,
            media_type=media_type,
            is_primary=is_primary,
            order=age_group.media_files.count()
        )
    
    @action(detail=True, methods=['post'])
    def set_primary(self, request, age_group_pk=None, pk=None):
        """Set a media file as primary"""
        media = self.get_object()
        age_group = media.age_group
        
        age_group.media_files.update(is_primary=False)
        media.is_primary = True
        media.save()
        
        return Response({'message': 'Primary media set successfully'})


class AgeGroupViewSet(viewsets.ReadOnlyModelViewSet):
    """Public list of shopper age segments (Baby, Kids, Teens, ...) for age-based shopping."""
    queryset = AgeGroup.objects.filter(is_active=True)
    serializer_class = AgeGroupSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    filter_backends = [filters.OrderingFilter]
    ordering = ['order']
    
    @action(detail=True, methods=['get'], url_path='products')
    def get_products(self, request, pk=None):
        """Get products for a specific age group"""
        age_group = self.get_object()
        products = age_group.products.filter(status=Product.Status.ACTIVE)
        
        # Apply filters
        price_min = request.query_params.get('price_min')
        price_max = request.query_params.get('price_max')
        
        if price_min:
            products = products.filter(price__gte=price_min)
        if price_max:
            products = products.filter(price__lte=price_max)
        
        # Pagination
        page = self.paginate_queryset(products)
        if page is not None:
            serializer = ProductListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = ProductListSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='with-product-counts')
    def with_product_counts(self, request):
        """Get all age groups with product counts"""
        age_groups = self.get_queryset().annotate(
            product_count=Count('products', filter=Q(products__status=Product.Status.ACTIVE))
        )
        serializer = self.get_serializer(age_groups, many=True)
        return Response(serializer.data)


class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    """View for departments with optional image inclusion"""
    queryset = Department.objects.filter(is_active=True)
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields = ['order', 'name', 'created_at']
    ordering = ['order']

    @action(detail=True, methods=['get'], url_path='categories')
    def get_categories(self, request, pk=None):
        """Get all categories for a specific department"""
        department = self.get_object()
        categories = department.categories.all()
        serializer = CategorySerializer(categories, many=True, context={'request': request})
        return Response({
            'department': DepartmentSerializer(department, context={'request': request}).data,
            'categories': serializer.data,
            'count': categories.count()
        })

    @action(detail=True, methods=['get'], url_path='featured-products')
    def get_featured_products(self, request, pk=None):
        """Get featured products for a department"""
        department = self.get_object()
        products = Product.objects.filter(
            category__department=department,
            status=Product.Status.ACTIVE,
            is_featured=True
        )[:10]
        serializer = ProductListSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='with-product-counts')
    def with_product_counts(self, request):
        """Get all departments with product counts"""
        departments = self.get_queryset().annotate(
            product_count=Count('categories__products', filter=Q(categories__products__status=Product.Status.ACTIVE))
        )
        serializer = self.get_serializer(departments, many=True)
        return Response(serializer.data)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """View for categories with hierarchical support"""
    queryset = Category.objects.select_related("department").prefetch_related("children")
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["department__slug", "parent"]
    search_fields = ["name", "department__name"]
    ordering_fields = ["order", "name"]
    ordering = ["department__order", "order"]

    @action(detail=True, methods=['get'], url_path='products')
    def get_products(self, request, pk=None):
        """Get products for a specific category"""
        category = self.get_object()
        products = Product.objects.filter(
            category=category,
            status=Product.Status.ACTIVE
        )
        
        price_min = request.query_params.get('price_min')
        price_max = request.query_params.get('price_max')
        rating = request.query_params.get('rating')
        
        if price_min:
            products = products.filter(price__gte=price_min)
        if price_max:
            products = products.filter(price__lte=price_max)
        if rating:
            products = products.filter(rating_avg__gte=rating)
        
        page = self.paginate_queryset(products)
        if page is not None:
            serializer = ProductListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = ProductListSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='subcategories')
    def get_subcategories(self, request, pk=None):
        """Get all subcategories for a category"""
        category = self.get_object()
        subcategories = category.children.all()
        serializer = CategorySerializer(subcategories, many=True, context={'request': request})
        return Response({
            'parent': CategorySerializer(category, context={'request': request}).data,
            'subcategories': serializer.data,
            'count': subcategories.count()
        })

    @action(detail=False, methods=['get'], url_path='tree')
    def get_category_tree(self, request):
        """Get the full category tree with departments"""
        departments = Department.objects.filter(is_active=True)
        result = []
        for dept in departments:
            categories = Category.objects.filter(department=dept, parent__isnull=True)
            dept_data = DepartmentSerializer(dept, context={'request': request}).data
            dept_data['categories'] = CategorySerializer(categories, many=True, context={'request': request}).data
            result.append(dept_data)
        return Response(result)


class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    """View for brands"""
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ["name"]
    filterset_fields = ["name"]

    @action(detail=True, methods=['get'], url_path='products')
    def get_products(self, request, pk=None):
        """Get products for a specific brand"""
        brand = self.get_object()
        products = Product.objects.filter(
            brand=brand,
            status=Product.Status.ACTIVE
        )
        serializer = ProductListSerializer(products, many=True, context={'request': request})
        return Response({
            'brand': BrandSerializer(brand).data,
            'products': serializer.data,
            'count': products.count()
        })

# Add BrandMediaViewSet
class BrandMediaViewSet(viewsets.ModelViewSet):
    """View for managing brand media"""
    serializer_class = BrandMediaSerializer
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]
    
    def get_queryset(self):
        brand_id = self.kwargs.get('brand_pk')
        if brand_id:
            return BrandMedia.objects.filter(brand_id=brand_id)
        return BrandMedia.objects.none()
    
    def perform_create(self, serializer):
        brand = get_object_or_404(Brand, id=self.kwargs['brand_pk'])
        media_type = self.request.data.get('media_type', 'image')
        
        is_primary = self.request.data.get('is_primary', False)
        if is_primary or not brand.media_files.exists():
            brand.media_files.update(is_primary=False)
            is_primary = True
        
        serializer.save(
            brand=brand,
            media_type=media_type,
            is_primary=is_primary,
            order=brand.media_files.count()
        )
    
    @action(detail=True, methods=['post'])
    def set_primary(self, request, brand_pk=None, pk=None):
        """Set a media file as primary"""
        media = self.get_object()
        brand = media.brand
        
        brand.media_files.update(is_primary=False)
        media.is_primary = True
        media.save()
        
        return Response({'message': 'Primary media set successfully'})


class ProductViewSet(viewsets.ModelViewSet):
    """
    Public: list/retrieve active products only.
    Vendors: manage their own products (any status) via /api/catalog/my-products/ instead.
    """
    queryset = Product.objects.filter(status=Product.Status.ACTIVE).select_related(
        "vendor", "category", "category__department", "brand"
    ).prefetch_related("images", "variants", "reviews", "age_groups")
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    filterset_fields = [
        "category__slug", "category__department__slug", "brand__slug", 
        "vendor__slug", "is_featured", "price", "age_groups__slug"
    ]
    search_fields = ["name", "description", "brand__name", "category__name"]
    ordering_fields = ["price", "created_at", "rating_avg", "discount_percentage"]
    ordering = ["-created_at"]
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'
    lookup_value_regex = '[^/]+'

    def get_serializer_class(self):
        if self.action == "list":
            return ProductListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return ProductWriteSerializer
        return ProductDetailSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated(), IsOwnerVendorOrReadOnly()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        queryset = queryset.annotate(
            avg_rating=Avg('reviews__rating'),
            discount_percentage=Case(
                When(
                    compare_at_price__isnull=False,
                    compare_at_price__gt=F('price'),
                    then=Round(
                        (F('compare_at_price') - F('price')) * 100.0 / F('compare_at_price'),
                        0
                    )
                ),
                default=Value(0),
                output_field=DecimalField(max_digits=5, decimal_places=0)
            )
        )
        
        return queryset

    @action(detail=False, methods=['get'], url_path='featured')
    def get_featured(self, request):
        """Get featured products"""
        products = self.get_queryset().filter(is_featured=True)[:20]
        page = self.paginate_queryset(products)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='new-arrivals')
    def get_new_arrivals(self, request):
        """Get new arrivals (products from the last 30 days)"""
        from django.utils import timezone
        from datetime import timedelta
        
        thirty_days_ago = timezone.now() - timedelta(days=30)
        products = self.get_queryset().filter(created_at__gte=thirty_days_ago)[:20]
        serializer = ProductListSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='on-sale')
    def get_on_sale(self, request):
        """Get products with discounts"""
        products = self.get_queryset().exclude(compare_at_price__isnull=True).exclude(
            compare_at_price__lte=F('price')
        )[:20]
        serializer = ProductListSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='top-rated')
    def get_top_rated(self, request):
        """Get top-rated products"""
        products = self.get_queryset().filter(rating_count__gte=5).order_by('-rating_avg')[:20]
        serializer = ProductListSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def add_review(self, request, pk=None):
        """Add a review to a product"""
        product = self.get_object()
        rating = request.data.get('rating')
        comment = request.data.get('comment', '')
        
        if not rating:
            return Response({'error': 'Rating is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                raise ValueError
        except ValueError:
            return Response({'error': 'Rating must be between 1 and 5'}, status=status.HTTP_400_BAD_REQUEST)
        
        existing_review = Review.objects.filter(product=product, user=request.user).first()
        if existing_review:
            return Response({'error': 'You have already reviewed this product'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        review = Review.objects.create(
            product=product,
            user=request.user,
            rating=rating,
            comment=comment
        )
        
        avg_rating = product.reviews.aggregate(Avg('rating'))['rating__avg']
        product.rating_avg = avg_rating or 0
        product.rating_count = product.reviews.count()
        product.save()
        
        serializer = ReviewSerializer(review, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MyProductsViewSet(viewsets.ModelViewSet):
    """Vendor-only CRUD over their own catalog, any status."""
    serializer_class = ProductWriteSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerVendorOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        if not hasattr(self.request.user, "vendor_profile"):
            return Product.objects.none()
        return Product.objects.filter(vendor=self.request.user.vendor_profile).select_related(
            "category", "category__department", "brand"
        ).prefetch_related("images", "variants", "age_groups").annotate(
            discount_percent=Case(
                When(
                    compare_at_price__isnull=False,
                    compare_at_price__gt=F('price'),
                    then=Round(
                        (F('compare_at_price') - F('price')) * 100.0 / F('compare_at_price'),
                        0
                    )
                ),
                default=Value(0),
                output_field=DecimalField(max_digits=5, decimal_places=0)
            )
        )

    def perform_create(self, serializer):
        serializer.save(
            vendor=self.request.user.vendor_profile,
            status=Product.Status.PENDING
        )

    @action(detail=False, methods=['get'], url_path='stats')
    def get_stats(self, request):
        """Get statistics for vendor's products"""
        vendor = request.user.vendor_profile
        products = Product.objects.filter(vendor=vendor)
        
        stats = {
            'total': products.count(),
            'active': products.filter(status=Product.Status.ACTIVE).count(),
            'pending': products.filter(status=Product.Status.PENDING).count(),
            'draft': products.filter(status=Product.Status.DRAFT).count(),
            'rejected': products.filter(status=Product.Status.REJECTED).count(),
            'total_stock': products.aggregate(total=models.Sum('stock'))['total'] or 0,
            'total_value': products.aggregate(total=models.Sum('price'))['total'] or 0,
        }
        return Response(stats)

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser], url_path="images")
    def upload_image(self, request, pk=None):
        """Vendor Product Management: attach a photo to one of the vendor's own products."""
        product = self.get_object()
        image_file = request.FILES.get("image")
        
        if not image_file:
            return Response({"detail": "image file is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if image_file.size > 5 * 1024 * 1024:
            return Response({"detail": "Image size should not exceed 5MB"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        make_primary = request.data.get("is_primary") in ("true", "True", "1", True)
        next_order = product.images.count()
        
        if make_primary:
            product.images.update(order=models.F('order') + 1)
            order = 0
        else:
            order = next_order
            
        image = ProductImage.objects.create(product=product, image=image_file, order=order)
        serializer = ProductImageSerializer(image, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"images/(?P<image_id>\d+)")
    def delete_image(self, request, pk=None, image_id=None):
        product = self.get_object()
        image = get_object_or_404(product.images, id=image_id)
        image.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="images/(?P<image_id>\d+)/set-primary")
    def set_primary_image(self, request, pk=None, image_id=None):
        """Set an image as primary"""
        product = self.get_object()
        image = get_object_or_404(product.images, id=image_id)
        
        product.images.update(order=models.F('order') + 1)
        image.order = 0
        image.save()
        
        return Response({'message': 'Primary image set successfully'}, status=status.HTTP_200_OK)


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Review.objects.filter(product_id=self.kwargs["product_pk"]).select_related("user")

    def perform_create(self, serializer):
        product = get_object_or_404(Product, id=self.kwargs["product_pk"])
        serializer.save(user=self.request.user, product=product)
        
        from django.db.models import Avg
        avg_rating = product.reviews.aggregate(Avg('rating'))['rating__avg']
        product.rating_avg = avg_rating or 0
        product.rating_count = product.reviews.count()
        product.save()


class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related("product")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='count')
    def get_count(self, request):
        """Get the number of items in wishlist"""
        count = self.get_queryset().count()
        return Response({'count': count})


class AdminProductModerationViewSet(viewsets.ModelViewSet):
    """Admin 'Product Moderation' module: review vendor submissions, approve/reject."""
    queryset = Product.objects.select_related("vendor", "category", "category__department", "brand").prefetch_related("images", "age_groups")
    serializer_class = ProductAdminSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "vendor", "category", "age_groups"]
    search_fields = ["name", "sku", "vendor__store_name"]
    ordering_fields = ["created_at", "price", "name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.annotate(
            discount_percent=Case(
                When(
                    compare_at_price__isnull=False,
                    compare_at_price__gt=F('price'),
                    then=Round(
                        (F('compare_at_price') - F('price')) * 100.0 / F('compare_at_price'),
                        0
                    )
                ),
                default=Value(0),
                output_field=DecimalField(max_digits=5, decimal_places=0)
            )
        )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        product = self.get_object()
        product.status = Product.Status.ACTIVE
        product.save(update_fields=["status"])
        self._notify(product, "Product Approved", f"Your product '{product.name}' has been approved and is now live on the storefront.")
        return Response(ProductDetailSerializer(product, context={'request': request}).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        product = self.get_object()
        reason = request.data.get('reason', 'No reason provided')
        product.status = Product.Status.REJECTED
        product.save(update_fields=["status"])
        self._notify(product, "Product Rejected", f"Your product '{product.name}' was rejected. Reason: {reason}")
        return Response(ProductDetailSerializer(product, context={'request': request}).data)

    @action(detail=True, methods=["post"])
    def request_changes(self, request, pk=None):
        """Request changes to a product"""
        product = self.get_object()
        feedback = request.data.get('feedback', '')
        product.status = Product.Status.PENDING
        product.save(update_fields=["status"])
        self._notify(product, "Changes Requested", f"Changes requested for '{product.name}'. Feedback: {feedback}")
        return Response({
            'message': 'Changes requested successfully',
            'product': ProductDetailSerializer(product, context={'request': request}).data
        })

    def _notify(self, product, title, body):
        """Send notification to vendor"""
        try:
            from notifications.utils import notify
            from notifications.models import Notification
            notify(product.vendor.user, title, body, Notification.Category.VENDOR)
        except ImportError:
            pass

    @action(detail=False, methods=['get'], url_path='pending-count')
    def pending_count(self, request):
        """Get count of pending products"""
        count = self.get_queryset().filter(status=Product.Status.PENDING).count()
        return Response({'pending_count': count})

    @action(detail=False, methods=['post'], url_path='bulk-approve')
    def bulk_approve(self, request):
        """Bulk approve products"""
        product_ids = request.data.get('product_ids', [])
        if not product_ids:
            return Response({'error': 'No product IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        products = Product.objects.filter(id__in=product_ids)
        count = products.update(status=Product.Status.ACTIVE)
        
        for product in products:
            self._notify(product, "Product Approved", f"Your product '{product.name}' has been approved.")
        
        return Response({'message': f'{count} products approved successfully'})

    @action(detail=False, methods=['post'], url_path='bulk-reject')
    def bulk_reject(self, request):
        """Bulk reject products"""
        data = request.data
        product_ids = data.get('product_ids', [])
        reason = data.get('reason', 'No reason provided')
        
        if not product_ids:
            return Response({'error': 'No product IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        products = Product.objects.filter(id__in=product_ids)
        count = products.update(status=Product.Status.REJECTED)
        
        for product in products:
            self._notify(product, "Product Rejected", f"Your product '{product.name}' was rejected. Reason: {reason}")
        
        return Response({'message': f'{count} products rejected successfully'})