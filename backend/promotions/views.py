from django.utils import timezone
from rest_framework import viewsets, permissions, views, status
from rest_framework.response import Response
from orders.models import Coupon
from .models import Campaign, ShowcaseVideo, CouponClaim
from .serializers import (
    CouponSerializer, CampaignSerializer, ShowcaseVideoSerializer, CouponValidateSerializer,
    CouponWalletSerializer, CouponClaimSerializer,
)


class IsAdminOrVendor(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        u = request.user
        return u.is_authenticated and (u.is_staff or getattr(u, "role", None) in ("admin", "vendor"))


class CouponViewSet(viewsets.ModelViewSet):
    """Coupons & Promotions: admins/vendors create discount codes, anyone can validate one."""
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [IsAdminOrVendor]


class CampaignViewSet(viewsets.ModelViewSet):
    """Homepage/category banners and email/push campaigns for the admin Promotions module."""
    serializer_class = CampaignSerializer
    permission_classes = [IsAdminOrVendor]

    def get_queryset(self):
        qs = Campaign.objects.all()
        if self.action == "list" and self.request.query_params.get("live") == "true":
            now = timezone.now()
            qs = qs.filter(active=True, starts_at__lte=now).exclude(ends_at__lt=now)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ShowcaseVideoViewSet(viewsets.ModelViewSet):
    """Standalone shoppable videos for the homepage 'Watch & shop' rail — own upload,
    not derived from department/category media."""
    serializer_class = ShowcaseVideoSerializer
    permission_classes = [IsAdminOrVendor]

    def get_queryset(self):
        qs = ShowcaseVideo.objects.select_related("product", "department").all()
        user = self.request.user
        if self.action == "list" and not (user.is_authenticated and user.is_staff):
            qs = qs.filter(active=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ValidateCouponView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CouponValidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data["code"]
        subtotal = serializer.validated_data.get("subtotal") or 0
        now = timezone.now()
        try:
            coupon = Coupon.objects.get(code__iexact=code, active=True)
        except Coupon.DoesNotExist:
            return Response({"valid": False, "detail": "Invalid or expired coupon."}, status=status.HTTP_404_NOT_FOUND)
        if coupon.valid_until and coupon.valid_until < now:
            return Response({"valid": False, "detail": "This coupon has expired."}, status=status.HTTP_400_BAD_REQUEST)
        discount = float(coupon.amount_off) if coupon.amount_off else float(subtotal) * (coupon.percent_off or 0) / 100
        return Response({"valid": True, "code": coupon.code, "discount": round(discount, 2)})


class AvailableCouponsView(views.APIView):
    """Public, active coupons a signed-in customer can browse and save — the
    'My Coupons' page's top section. Flags coupons already saved by this user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        qs = Coupon.objects.filter(active=True, is_public=True).exclude(valid_until__lt=now)
        claimed_ids = set(CouponClaim.objects.filter(user=request.user).values_list("coupon_id", flat=True))
        data = CouponWalletSerializer(qs, many=True, context={"claimed_ids": claimed_ids}).data
        return Response(data)


class MyCouponsView(views.APIView):
    """A signed-in customer's saved coupon wallet."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        claims = CouponClaim.objects.filter(user=request.user).select_related("coupon")
        return Response(CouponClaimSerializer(claims, many=True).data)


class ClaimCouponView(views.APIView):
    """Save a public coupon to the signed-in customer's wallet."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = request.data.get("code", "")
        try:
            coupon = Coupon.objects.get(code__iexact=code, active=True, is_public=True)
        except Coupon.DoesNotExist:
            return Response({"detail": "Invalid or unavailable coupon."}, status=status.HTTP_404_NOT_FOUND)
        claim, created = CouponClaim.objects.get_or_create(user=request.user, coupon=coupon)
        return Response(CouponClaimSerializer(claim).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
