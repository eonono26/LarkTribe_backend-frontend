from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta
from rest_framework import generics, permissions, views
from rest_framework.response import Response
from orders.models import Order, OrderItem
from vendors.models import Vendor
from catalog.models import Product
from accounts.models import User
from .models import BehaviorEvent, DailyMetric
from .serializers import BehaviorEventSerializer, DailyMetricSerializer


def _session_key(request):
    if not request.session.session_key:
        request.session.save()
    return request.session.session_key or ""


class TrackEventView(generics.CreateAPIView):
    """Fire-and-forget behavior tracking endpoint used by web + mobile clients."""
    serializer_class = BehaviorEventSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user if self.request.user.is_authenticated else None,
            session_key=self.request.data.get("session_key") or _session_key(self.request),
        )


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return u.is_authenticated and (u.is_staff or getattr(u, "role", None) == "admin")


class AdminReportsView(views.APIView):
    """Admin 'Reports & Analytics': orders, revenue, users, vendors, top products, funnel."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        days = int(request.query_params.get("days", 30))
        since = timezone.now() - timedelta(days=days)

        orders_qs = Order.objects.filter(created_at__gte=since)
        revenue = orders_qs.exclude(status__in=["cancelled", "pending_payment"]).aggregate(total=Sum("total"))["total"] or 0

        top_products = (
            OrderItem.objects.filter(order__created_at__gte=since)
            .values("product__id", "product__name")
            .annotate(units_sold=Sum("quantity"), revenue=Sum("unit_price"))
            .order_by("-units_sold")[:10]
        )

        funnel = {
            "product_views": BehaviorEvent.objects.filter(event_type="product_view", created_at__gte=since).count(),
            "add_to_cart": BehaviorEvent.objects.filter(event_type="cart_add", created_at__gte=since).count(),
            "checkout_started": BehaviorEvent.objects.filter(event_type="checkout_start", created_at__gte=since).count(),
            "checkout_abandoned": BehaviorEvent.objects.filter(event_type="checkout_abandon", created_at__gte=since).count(),
            "purchases": orders_qs.count(),
        }

        return Response({
            "range_days": days,
            "orders": orders_qs.count(),
            "revenue": revenue,
            "new_users": User.objects.filter(date_joined__gte=since).count(),
            "active_vendors": Vendor.objects.filter(status="approved").count(),
            "pending_vendors": Vendor.objects.filter(status="pending").count(),
            "products_pending_moderation": Product.objects.filter(status="pending").count(),
            "top_products": list(top_products),
            "conversion_funnel": funnel,
            "open_support_tickets": _open_tickets(),
        })


def _open_tickets():
    from notifications.models import SupportTicket
    return SupportTicket.objects.filter(status__in=["open", "in_progress"]).count()


class DailyMetricsView(generics.ListAPIView):
    serializer_class = DailyMetricSerializer
    permission_classes = [IsAdminUser]
    queryset = DailyMetric.objects.all()[:60]
