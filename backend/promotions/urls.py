from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CouponViewSet, CampaignViewSet, ShowcaseVideoViewSet, ValidateCouponView,
    AvailableCouponsView, MyCouponsView, ClaimCouponView,
)

router = DefaultRouter()
router.register("coupons", CouponViewSet, basename="coupon")
router.register("campaigns", CampaignViewSet, basename="campaign")
router.register("showcase-videos", ShowcaseVideoViewSet, basename="showcase-video")

urlpatterns = [
    path("validate-coupon/", ValidateCouponView.as_view(), name="validate-coupon"),
    path("coupons/available/", AvailableCouponsView.as_view(), name="coupons-available"),
    path("coupons/mine/", MyCouponsView.as_view(), name="coupons-mine"),
    path("coupons/claim/", ClaimCouponView.as_view(), name="coupons-claim"),
    path("", include(router.urls)),
]
