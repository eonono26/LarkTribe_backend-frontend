from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VendorApplyView, MyVendorProfileView, VendorListView, VendorSalesDashboardView, AdminVendorViewSet

router = DefaultRouter()
router.register("admin", AdminVendorViewSet, basename="admin-vendor")

urlpatterns = [
    path("apply/", VendorApplyView.as_view(), name="vendor-apply"),
    path("me/", MyVendorProfileView.as_view(), name="vendor-me"),
    path("sales-dashboard/", VendorSalesDashboardView.as_view(), name="vendor-sales-dashboard"),
    path("", include(router.urls)),
    path("", VendorListView.as_view(), name="vendor-list"),
]
