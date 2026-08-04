from rest_framework import generics, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from .models import Vendor
from .serializers import VendorSerializer, VendorApplySerializer, VendorAdminSerializer


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return u.is_authenticated and (u.is_staff or getattr(u, "role", None) == "admin")


class VendorApplyView(generics.CreateAPIView):
    serializer_class = VendorApplySerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        if hasattr(self.request.user, "vendor_profile"):
            raise PermissionDenied("You already have a vendor profile.")
        serializer.save(user=self.request.user)
        self.request.user.role = "vendor"
        self.request.user.save(update_fields=["role"])


class MyVendorProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = VendorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.vendor_profile


class VendorListView(generics.ListAPIView):
    queryset = Vendor.objects.filter(status="approved")
    serializer_class = VendorSerializer
    permission_classes = [permissions.AllowAny]


class VendorSalesDashboardView(generics.GenericAPIView):
    """Vendor 'Sales Dashboard': revenue, order counts, top products for the logged-in vendor."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Sum, Count
        from rest_framework.response import Response
        from orders.models import OrderItem
        from catalog.models import Product

        if not hasattr(request.user, "vendor_profile"):
            return Response({"detail": "Not a vendor."}, status=403)
        vendor = request.user.vendor_profile

        items = OrderItem.objects.filter(vendor=vendor)
        totals = items.aggregate(revenue=Sum("unit_price"), units=Sum("quantity"), orders=Count("order", distinct=True))
        top_products = (
            items.values("product__id", "product__name")
            .annotate(units_sold=Sum("quantity"))
            .order_by("-units_sold")[:5]
        )
        return Response({
            "store_name": vendor.store_name,
            "status": vendor.status,
            "total_revenue": totals["revenue"] or 0,
            "units_sold": totals["units"] or 0,
            "orders": totals["orders"] or 0,
            "active_products": Product.objects.filter(vendor=vendor, status="active").count(),
            "pending_products": Product.objects.filter(vendor=vendor, status="pending").count(),
            "top_products": list(top_products),
        })


class AdminVendorViewSet(viewsets.ModelViewSet):
    """Admin 'Vendor Approval' module: list all vendors, approve/suspend."""
    queryset = Vendor.objects.select_related("user").all()
    serializer_class = VendorAdminSerializer
    permission_classes = [IsAdminUser]

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        vendor = self.get_object()
        vendor.status = "approved"
        vendor.save(update_fields=["status"])
        from notifications.utils import notify
        from notifications.models import Notification
        notify(vendor.user, "Your vendor application was approved", "You can now list products on duka.", Notification.Category.VENDOR)
        return Response(VendorAdminSerializer(vendor).data)

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        vendor = self.get_object()
        vendor.status = "suspended"
        vendor.save(update_fields=["status"])
        from notifications.utils import notify
        from notifications.models import Notification
        notify(vendor.user, "Your vendor account was suspended", "Contact support for details.", Notification.Category.VENDOR)
        return Response(VendorAdminSerializer(vendor).data)
