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
from .filters import ProductFilter, CategoryFilter, BrandFilter
from .pagination import LargePageNumberPagination
from .utils import category_subtree_ids


from rest_framework.decorators import api_view
from rest_framework.response import Response
from catalog.models import Department, Category, Product, AgeGroup
from promotions.models import Campaign
from catalog.serializers import (
    DepartmentSerializer, CategorySerializer, ProductListSerializer,
    AgeGroupSerializer
)

from promotions.serializers import CampaignSerializer

@api_view(['GET'])
def home_data(request):
    """
    Consolidated home payload.
    Everything the editorial home needs in a single round-trip.
    """
    # Hero campaigns
    campaigns = Campaign.objects.filter(
        placement='homepage_banner',
        active=True,
        is_live=True
    ).select_related('department', 'coupon').order_by('-created_at')[:6]

    # Departments with primary image
    departments = Department.objects.filter(is_active=True).prefetch_related('media')

    # Age groups
    age_groups = AgeGroup.objects.filter(is_active=True).order_by('min_age_years')

    # Trending / new arrivals
    products = Product.objects.filter(
        is_active=True,
        status='published'
    ).select_related('department', 'brand').prefetch_related(
        'media', 'variants', 'age_groups'
    ).order_by('-created_at')[:12]

    # Build quick category trees for mega-menu pre-fetch
    categories = Category.objects.filter(is_active=True).select_related('parent')

    return Response({
        'hero_campaigns': CampaignSerializer(campaigns, many=True, context={'request': request}).data,
        'departments': DepartmentSerializer(departments, many=True, context={'request': request}).data,
        'age_groups': AgeGroupSerializer(age_groups, many=True, context={'request': request}).data,
        'new_arrivals': ProductListSerializer(products, many=True, context={'request': request}).data,
        'categories': CategorySerializer(categories, many=True, context={'request': request}).data,
    })



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


# ============================================================
# AGE GROUP VIEWSET
# ============================================================

class AgeGroupViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public age-group navigation.

    Example:

        /api/catalog/age-groups/?stage=baby

    Returns:

        0–3 Months
        3–6 Months
        6–12 Months
        12–24 Months
    """

    serializer_class = AgeGroupSerializer

    permission_classes = [
        permissions.AllowAny
    ]

    pagination_class = None

    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
    ]

    filterset_fields = [
        "stage",
        "is_active",
    ]

    ordering_fields = [
        "order",
        "min_age_years",
        "max_age_years",
        "name",
    ]

    ordering = [
        "order",
    ]

    def get_queryset(self):

        return (
            AgeGroup.objects
            .filter(is_active=True)
            .prefetch_related("media_files")
        )

    # --------------------------------------------------------
    # AGE GROUPS BY STAGE
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["get"],
        url_path="by-stage"
    )
    def by_stage(self, request):
        """
        Example:

            /api/catalog/age-groups/by-stage/?stage=baby
        """

        stage = request.query_params.get(
            "stage",
            "baby"
        )

        valid_stages = {
            choice[0]
            for choice in AgeGroup.Stage.choices
        }

        if stage not in valid_stages:

            return Response({
                "error": "Invalid stage.",
                "valid_stages": list(
                    valid_stages
                ),
            }, status=status.HTTP_400_BAD_REQUEST)

        age_groups = self.get_queryset().filter(
            stage=stage
        )

        serializer = self.get_serializer(
            age_groups,
            many=True
        )

        return Response({
            "stage": stage,
            "age_groups": serializer.data,
            "count": age_groups.count(),
        })

    # --------------------------------------------------------
    # AGE GROUP PRODUCTS
    # --------------------------------------------------------

    @action(
        detail=True,
        methods=["get"],
        url_path="products"
    )
    def get_products(self, request, pk=None):

        age_group = self.get_object()

        products = (
            Product.objects
            .filter(
                age_groups=age_group,
                status=Product.Status.ACTIVE,
            )
            .select_related(
                "vendor",
                "category",
                "category__department",
                "brand",
            )
            .prefetch_related(
                "images",
                "variants",
                "age_groups",
            )
        )

        # ----------------------------------------------------
        # GENDER
        # ----------------------------------------------------

        gender = request.query_params.get(
            "gender"
        )

        if gender:

            valid_genders = {
                choice[0]
                for choice in Product.Gender.choices
            }

            if gender not in valid_genders:

                return Response({
                    "error": "Invalid gender.",
                    "valid_genders": list(
                        valid_genders
                    ),
                }, status=status.HTTP_400_BAD_REQUEST)

            products = products.filter(
                gender=gender
            )

        # ----------------------------------------------------
        # CATEGORY
        # ----------------------------------------------------

        category_slug = request.query_params.get(
            "category"
        )

        if category_slug:
            products = products.filter(
                category__slug=category_slug
            )

        # ----------------------------------------------------
        # PRICE
        # ----------------------------------------------------

        price_min = request.query_params.get(
            "price_min"
        )

        price_max = request.query_params.get(
            "price_max"
        )

        if price_min:
            products = products.filter(
                price__gte=price_min
            )

        if price_max:
            products = products.filter(
                price__lte=price_max
            )

        # ----------------------------------------------------
        # ORDERING
        # ----------------------------------------------------

        ordering = request.query_params.get(
            "ordering"
        )

        if ordering in [
            "price",
            "-price",
            "created_at",
            "-created_at",
            "rating_avg",
            "-rating_avg",
        ]:
            products = products.order_by(
                ordering
            )
        else:
            products = products.order_by(
                "-created_at"
            )

        # ----------------------------------------------------
        # PAGINATION
        # ----------------------------------------------------

        page = self.paginate_queryset(
            products
        )

        if page is not None:

            serializer = ProductListSerializer(
                page,
                many=True,
                context={
                    "request": request
                },
            )

            return self.get_paginated_response(
                serializer.data
            )

        serializer = ProductListSerializer(
            products,
            many=True,
            context={
                "request": request
            },
        )

        return Response(
            serializer.data
        )

    # --------------------------------------------------------
    # PRODUCT COUNTS
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["get"],
        url_path="with-product-counts"
    )
    def with_product_counts(self, request):

        age_groups = (
            self.get_queryset()
            .annotate(
                product_count=Count(
                    "products",
                    filter=Q(
                        products__status=
                        Product.Status.ACTIVE
                    ),
                    distinct=True,
                )
            )
        )

        stage = request.query_params.get(
            "stage"
        )

        if stage:
            age_groups = age_groups.filter(
                stage=stage
            )

        serializer = self.get_serializer(
            age_groups,
            many=True
        )

        return Response(
            serializer.data
        )


# ============================================================
# CATEGORY VIEWSET
# ============================================================

class CategoryViewSet(
    viewsets.ReadOnlyModelViewSet
):
    """
    Category navigation.

    Categories remain product categories.

    Example:

        Kids
          └── Baby
                ├── Dresses
                ├── Tops
                ├── Rompers
                ├── Trousers
                └── Shoes

    Gender and age remain filters.
    """

    serializer_class = CategorySerializer

    permission_classes = [
        permissions.AllowAny
    ]

    pagination_class = LargePageNumberPagination

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    filterset_class = CategoryFilter

    search_fields = [
        "name",
        "department__name",
    ]

    ordering_fields = [
        "order",
        "name",
    ]

    ordering = [
        "department__order",
        "order",
    ]

    def get_queryset(self):

        return (
            Category.objects
            .filter(is_active=True)
            .select_related(
                "department",
                "parent",
            )
            .prefetch_related(
                "children",
                "media_files",
            )
        )

    # --------------------------------------------------------
    # PRODUCTS IN CATEGORY
    # --------------------------------------------------------

    @action(
        detail=True,
        methods=["get"],
        url_path="products"
    )
    def get_products(self, request, pk=None):

        category = self.get_object()

        products = (
            Product.objects
            .filter(
                category=category,
                status=Product.Status.ACTIVE,
            )
            .select_related(
                "vendor",
                "category",
                "category__department",
                "brand",
            )
            .prefetch_related(
                "images",
                "variants",
                "age_groups",
            )
        )

        # ----------------------------------------------------
        # GENDER FILTER
        # ----------------------------------------------------

        gender = request.query_params.get(
            "gender"
        )

        if gender:

            valid_genders = {
                choice[0]
                for choice in Product.Gender.choices
            }

            if gender not in valid_genders:

                return Response({
                    "error": "Invalid gender.",
                    "valid_genders": list(
                        valid_genders
                    ),
                }, status=status.HTTP_400_BAD_REQUEST)

            products = products.filter(
                gender=gender
            )

        # ----------------------------------------------------
        # AGE FILTER
        # ----------------------------------------------------

        age_slug = request.query_params.get(
            "age"
        )

        age_id = request.query_params.get(
            "age_id"
        )

        if age_slug:

            products = products.filter(
                age_groups__slug=age_slug
            )

        elif age_id:

            products = products.filter(
                age_groups__id=age_id
            )

        # ----------------------------------------------------
        # PRICE FILTER
        # ----------------------------------------------------

        price_min = request.query_params.get(
            "price_min"
        )

        price_max = request.query_params.get(
            "price_max"
        )

        if price_min:
            products = products.filter(
                price__gte=price_min
            )

        if price_max:
            products = products.filter(
                price__lte=price_max
            )

        # ----------------------------------------------------
        # RATING
        # ----------------------------------------------------

        rating = request.query_params.get(
            "rating"
        )

        if rating:

            products = products.filter(
                rating_avg__gte=rating
            )

        # Remove duplicates caused by ManyToMany
        products = products.distinct()

        # ----------------------------------------------------
        # ORDERING
        # ----------------------------------------------------

        ordering = request.query_params.get(
            "ordering"
        )

        allowed_ordering = [
            "price",
            "-price",
            "created_at",
            "-created_at",
            "rating_avg",
            "-rating_avg",
        ]

        if ordering in allowed_ordering:
            products = products.order_by(
                ordering
            )
        else:
            products = products.order_by(
                "-created_at"
            )

        # ----------------------------------------------------
        # PAGINATION
        # ----------------------------------------------------

        page = self.paginate_queryset(
            products
        )

        if page is not None:

            serializer = ProductListSerializer(
                page,
                many=True,
                context={
                    "request": request
                },
            )

            return self.get_paginated_response(
                serializer.data
            )

        serializer = ProductListSerializer(
            products,
            many=True,
            context={
                "request": request
            },
        )

        return Response(
            serializer.data
        )

    # --------------------------------------------------------
    # SUBCATEGORIES
    # --------------------------------------------------------

    @action(
        detail=True,
        methods=["get"],
        url_path="subcategories"
    )
    def get_subcategories(
        self,
        request,
        pk=None
    ):

        category = self.get_object()

        subcategories = (
            category.children
            .filter(is_active=True)
            .select_related(
                "department"
            )
            .prefetch_related(
                "media_files"
            )
        )

        serializer = CategorySerializer(
            subcategories,
            many=True,
            context={
                "request": request
            },
        )

        return Response({
            "parent": CategorySerializer(
                category,
                context={
                    "request": request
                }
            ).data,

            "subcategories": serializer.data,

            "count": subcategories.count(),
        })

    # --------------------------------------------------------
    # CATEGORY TREE
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["get"],
        url_path="tree"
    )
    def get_category_tree(
        self,
        request
    ):
        """
        Returns the category tree.

        The frontend can use this to build:

            Kids
              ↓
            Baby
              ↓
            Dresses
            Tops
            Rompers
            Trousers
            Shoes
        """

        departments = (
            Department.objects
            .filter(is_active=True)
            .prefetch_related(
                "media_files"
            )
        )

        result = []

        for department in departments:

            root_categories = (
                Category.objects
                .filter(
                    department=department,
                    parent__isnull=True,
                    is_active=True,
                )
                .select_related(
                    "department"
                )
                .prefetch_related(
                    "children",
                    "media_files",
                )
                .order_by("order")
            )

            department_data = DepartmentSerializer(
                department,
                context={
                    "request": request
                }
            ).data

            department_data["categories"] = (
                CategorySerializer(
                    root_categories,
                    many=True,
                    context={
                        "request": request
                    },
                ).data
            )

            result.append(
                department_data
            )

        return Response(result)


# ============================================================
# PRODUCT VIEWSET
# ============================================================

class ProductViewSet(
    viewsets.ModelViewSet
):
    """
    Product API.

    Supports:

        gender
        age
        category
        department
        brand
        price

    Example:

        /api/catalog/products/
            ?gender=girls
            &age=6-12-months
            &category=dresses
    """

    serializer_class = ProductDetailSerializer

    permission_classes = [
        permissions.AllowAny
    ]

    lookup_field = "slug"

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    filterset_class = ProductFilter

    search_fields = [
        "name",
        "description",
        "brand__name",
        "category__name",
    ]

    ordering_fields = [
        "price",
        "created_at",
        "rating_avg",
        "discount_percentage",
    ]

    ordering = [
        "-created_at"
    ]

    def get_queryset(self):

        queryset = (
            Product.objects
            .filter(
                status=Product.Status.ACTIVE
            )
            .select_related(
                "vendor",
                "category",
                "category__department",
                "brand",
            )
            .prefetch_related(
                "images",
                "variants",
                "reviews",
                "age_groups",
            )
        )

        # ----------------------------------------------------
        # GENDER
        # ----------------------------------------------------

        gender = self.request.query_params.get(
            "gender"
        )

        if gender:
            queryset = queryset.filter(
                gender=gender
            )

        # ----------------------------------------------------
        # AGE
        # ----------------------------------------------------

        age = self.request.query_params.get(
            "age"
        )

        if age:
            queryset = queryset.filter(
                age_groups__slug=age
            )

        age_id = self.request.query_params.get(
            "age_id"
        )

        if age_id:
            queryset = queryset.filter(
                age_groups__id=age_id
            )

        # ----------------------------------------------------
        # CATEGORY
        # ----------------------------------------------------

        category = self.request.query_params.get(
            "category"
        )

        if category:
            queryset = queryset.filter(
                category_id__in=category_subtree_ids(category)
            )

        # ----------------------------------------------------
        # DEPARTMENT
        # ----------------------------------------------------

        department = self.request.query_params.get(
            "department"
        )

        if department:
            queryset = queryset.filter(
                category__department__slug=department
            )

        # ----------------------------------------------------
        # DISTINCT
        # ----------------------------------------------------

        queryset = queryset.distinct()

        # ----------------------------------------------------
        # RATINGS / DISCOUNTS
        # ----------------------------------------------------

        queryset = queryset.annotate(
            avg_rating=Avg(
                "reviews__rating"
            ),

            discount_percentage=Case(

                When(
                    compare_at_price__isnull=False,
                    compare_at_price__gt=F(
                        "price"
                    ),

                    then=Round(
                        (
                            F("compare_at_price")
                            - F("price")
                        )
                        * 100.0
                        / F("compare_at_price"),
                        0,
                    ),
                ),

                default=Value(0),

                output_field=DecimalField(
                    max_digits=5,
                    decimal_places=0,
                ),
            ),
        )

        return queryset

    # --------------------------------------------------------
    # SERIALIZER
    # --------------------------------------------------------

    def get_serializer_class(self):

        if self.action == "list":
            return ProductListSerializer

        if self.action in [
            "create",
            "update",
            "partial_update",
        ]:
            return ProductWriteSerializer

        return ProductDetailSerializer

    # --------------------------------------------------------
    # PERMISSIONS
    # --------------------------------------------------------

    def get_permissions(self):

        if self.action in [
            "create",
            "update",
            "partial_update",
            "destroy",
        ]:
            return [
                permissions.IsAuthenticated(),
                IsOwnerVendorOrReadOnly(),
            ]

        return [
            permissions.AllowAny()
        ]

    # --------------------------------------------------------
    # BABY SHOPPING
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["get"],
        url_path="baby"
    )
    def baby(self, request):
        """
        Convenience endpoint for the exact
        Baby shopping flow.

        Examples:

            /api/catalog/products/baby/

            /api/catalog/products/baby/
                ?gender=girls

            /api/catalog/products/baby/
                ?gender=girls
                &age=6-12-months

            /api/catalog/products/baby/
                ?gender=girls
                &age=6-12-months
                &category=dresses
        """

        products = self.get_queryset()

        # Force Baby age stage
        products = products.filter(
            age_groups__stage=AgeGroup.Stage.BABY
        )

        # Gender
        gender = request.query_params.get(
            "gender"
        )

        if gender:
            products = products.filter(
                gender=gender
            )

        # Age
        age = request.query_params.get(
            "age"
        )

        if age:
            products = products.filter(
                age_groups__slug=age
            )

        # Category
        category = request.query_params.get(
            "category"
        )

        if category:
            products = products.filter(
                category_id__in=category_subtree_ids(category)
            )

        products = products.distinct()

        page = self.paginate_queryset(
            products
        )

        if page is not None:

            serializer = ProductListSerializer(
                page,
                many=True,
                context={
                    "request": request
                },
            )

            return self.get_paginated_response(
                serializer.data
            )

        serializer = ProductListSerializer(
            products,
            many=True,
            context={
                "request": request
            },
        )

        return Response(
            serializer.data
        )


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


class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    """View for brands"""
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = LargePageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ["name"]
    filterset_class = BrandFilter

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
            discount_pct=Case(
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
        
        color = (request.data.get("color") or "").strip()
        view = request.data.get("view") or ProductImage.View.FRONT
        if view not in ProductImage.View.values:
            return Response(
                {"detail": f"view must be one of: {', '.join(ProductImage.View.values)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        make_primary = request.data.get("is_primary") in ("true", "True", "1", True)
        group = ProductImage.group(product.id, color)
        order = request.data.get("order")
        order = int(order) if str(order or "").isdigit() else group.count()

        image = ProductImage.objects.create(
            product=product,
            image=image_file,
            color=color,
            view=view,
            alt_text=request.data.get("alt_text", "") or product.name,
            order=order,
        )
        if make_primary:
            ProductImage.set_primary(image)
            image.refresh_from_db()
        serializer = ProductImageSerializer(image, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"images/(?P<image_id>\d+)")
    def delete_image(self, request, pk=None, image_id=None):
        product = self.get_object()
        image = get_object_or_404(product.images, id=image_id)
        image.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path=r"images/(?P<image_id>\d+)/set-primary")
    def set_primary_image(self, request, pk=None, image_id=None):
        """Set an image as primary"""
        product = self.get_object()
        image = get_object_or_404(product.images, id=image_id)
        ProductImage.set_primary(image)

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