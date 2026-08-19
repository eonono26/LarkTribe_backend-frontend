from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrderTrackingView, DriverMeView, DriverDeliveriesView, DriverDeliveryActionView,
    AdminDriverViewSet, AdminDeliveryViewSet,
)

router = DefaultRouter()
router.register("admin/drivers", AdminDriverViewSet, basename="admin-driver")
router.register("admin/deliveries", AdminDeliveryViewSet, basename="admin-delivery")

urlpatterns = [
    path("orders/<str:order_number>/tracking/", OrderTrackingView.as_view(), name="order-tracking"),
    path("driver/me/", DriverMeView.as_view(), name="driver-me"),
    path("driver/deliveries/", DriverDeliveriesView.as_view(), name="driver-deliveries"),
    path("driver/deliveries/<int:pk>/<str:action>/", DriverDeliveryActionView.as_view(), name="driver-delivery-action"),
    path("", include(router.urls)),
]
