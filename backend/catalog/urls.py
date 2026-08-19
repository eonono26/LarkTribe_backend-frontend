from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from .views import (
    DepartmentViewSet, CategoryViewSet, BrandViewSet, ProductViewSet,
    MyProductsViewSet, ReviewViewSet, WishlistViewSet,BrandMediaViewSet, AdminProductModerationViewSet,DepartmentMediaViewSet, CategoryMediaViewSet, AgeGroupViewSet
)

router = DefaultRouter()
router.register("departments", DepartmentViewSet, basename="department")
router.register("categories", CategoryViewSet, basename="category")
router.register("age-groups", AgeGroupViewSet, basename="age-group")

router.register(r'departments/(?P<department_pk>\d+)/media', DepartmentMediaViewSet, basename='department-media')
router.register(r'categories/(?P<category_pk>\d+)/media', CategoryMediaViewSet, basename='category-media')

router.register("brands", BrandViewSet, basename="brand")
router.register("products", ProductViewSet, basename="product")
router.register("my-products", MyProductsViewSet, basename="my-product")
router.register("wishlist", WishlistViewSet, basename="wishlist")
router.register("admin/products", AdminProductModerationViewSet, basename="admin-product")
router.register(r'brands/(?P<brand_pk>\d+)/media', BrandMediaViewSet, basename='brand-media')


urlpatterns = [
    path("", include(router.urls)),
    path("products/<int:product_pk>/reviews/", ReviewViewSet.as_view({"get": "list", "post": "create"}), name="product-reviews"),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)