from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DepartmentViewSet, CategoryViewSet, BrandViewSet, ProductViewSet,
    MyProductsViewSet, ReviewViewSet, WishlistViewSet, AdminProductModerationViewSet,
)

router = DefaultRouter()
router.register("departments", DepartmentViewSet, basename="department")
router.register("categories", CategoryViewSet, basename="category")
router.register("brands", BrandViewSet, basename="brand")
router.register("products", ProductViewSet, basename="product")
router.register("my-products", MyProductsViewSet, basename="my-product")
router.register("wishlist", WishlistViewSet, basename="wishlist")
router.register("admin/products", AdminProductModerationViewSet, basename="admin-product")

urlpatterns = [
    path("", include(router.urls)),
    path("products/<int:product_pk>/reviews/", ReviewViewSet.as_view({"get": "list", "post": "create"}), name="product-reviews"),
]
