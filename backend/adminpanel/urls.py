from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AdminAgeGroupViewSet, AdminBrandViewSet, AdminCategoryViewSet, AdminDepartmentViewSet,
    AdminLookupsView, AdminMediaMigrationView, AdminOrderViewSet, AdminOverviewView, AdminProductViewSet, AdminUserViewSet,
)

router = DefaultRouter()
router.register("products", AdminProductViewSet, basename="adminpanel-product")
router.register("departments", AdminDepartmentViewSet, basename="adminpanel-department")
router.register("categories", AdminCategoryViewSet, basename="adminpanel-category")
router.register("brands", AdminBrandViewSet, basename="adminpanel-brand")
router.register("age-groups", AdminAgeGroupViewSet, basename="adminpanel-agegroup")
router.register("orders", AdminOrderViewSet, basename="adminpanel-order")
router.register("users", AdminUserViewSet, basename="adminpanel-user")

urlpatterns = [
    path("overview/", AdminOverviewView.as_view(), name="adminpanel-overview"),
    path("lookups/", AdminLookupsView.as_view(), name="adminpanel-lookups"),
    path("media-migration/", AdminMediaMigrationView.as_view(), name="adminpanel-media-migration"),
    # Keep this critical import endpoint explicit instead of relying only on
    # DRF's generated nested-action route. This guarantees the exact URL used
    # by the admin client is registered before the router's catch-all routes.
    path(
        "products/<int:pk>/images/import/",
        AdminProductViewSet.as_view({"post": "import_repository_image"}),
        name="adminpanel-product-import-image",
    ),
    path("", include(router.urls)),
]
