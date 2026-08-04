from django.utils import timezone
from rest_framework import viewsets, permissions, views, status
from rest_framework.response import Response
from orders.models import Coupon
from .models import Campaign
from .serializers import CouponSerializer, CampaignSerializer, CouponValidateSerializer


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
