from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DeviceTokenView, NotificationPreferenceView, NotificationViewSet, SupportTicketViewSet

router = DefaultRouter()
router.register("inbox", NotificationViewSet, basename="notification")
router.register("support-tickets", SupportTicketViewSet, basename="support-ticket")

urlpatterns = [
    path("device-tokens/", DeviceTokenView.as_view(), name="device-token"),
    path("preferences/", NotificationPreferenceView.as_view(), name="notification-preferences"),
    path("", include(router.urls)),
]
