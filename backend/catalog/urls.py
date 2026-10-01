from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from .views import (
    DepartmentViewSet, CategoryViewSet, BrandViewSet, ProductViewSet,
    MyProductsViewSet, ReviewViewSet, WishlistViewSet, BrandMediaViewSet, 
    AdminProductModerationViewSet, DepartmentMediaViewSet, CategoryMediaViewSet, 
    AgeGroupViewSet, AgeGroupMediaViewSet,home_data
)

router = DefaultRouter()

# ==============================================================
# MAIN RESOURCES - All top-level
# ==============================================================
router.register(r"departments", DepartmentViewSet, basename="department")
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"age-groups", AgeGroupViewSet, basename="agegroup")
router.register(r"brands", BrandViewSet, basename="brand")
router.register(r"products", ProductViewSet, basename="product")
router.register(r"my-products", MyProductsViewSet, basename="my-product")
router.register(r"wishlist", WishlistViewSet, basename="wishlist")
router.register(r"admin/products", AdminProductModerationViewSet, basename="admin-product")

# ==============================================================
# MEDIA RESOURCES - Flat (simpler, works with DefaultRouter)
# ==============================================================
router.register(r"department-media", DepartmentMediaViewSet, basename="department-media")
router.register(r"category-media", CategoryMediaViewSet, basename="category-media")
router.register(r"brand-media", BrandMediaViewSet, basename="brand-media")
router.register(r"age-group-media", AgeGroupMediaViewSet, basename="agegroup-media")

# ==============================================================
# URL PATTERNS
# ==============================================================
urlpatterns = [
    path("", include(router.urls)),
    
    # Product reviews
    path(
        "products/<int:product_pk>/reviews/", 
        ReviewViewSet.as_view({"get": "list", "post": "create"}), 
        name="product-reviews"
    ),
    path('home/', home_data, name='home-data'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)