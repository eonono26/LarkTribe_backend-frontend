from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CouponViewSet, CampaignViewSet, ShowcaseVideoViewSet, ValidateCouponView

router = DefaultRouter()
router.register("coupons", CouponViewSet, basename="coupon")
router.register("campaigns", CampaignViewSet, basename="campaign")
router.register("showcase-videos", ShowcaseVideoViewSet, basename="showcase-video")

urlpatterns = [
    path("validate-coupon/", ValidateCouponView.as_view(), name="validate-coupon"),
    path("", include(router.urls)),
]
