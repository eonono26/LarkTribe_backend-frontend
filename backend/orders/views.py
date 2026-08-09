import uuid
from django.db import transaction
from rest_framework import generics, permissions, views, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .models import Order, OrderItem, Coupon
from .serializers import OrderSerializer, CheckoutSerializer
from cart.views import get_or_create_cart


class CheckoutView(views.APIView):
    """
    Guest checkout: only guest_email required, no auth.
    Member checkout: request.user is authenticated, guest_email ignored.
    Mirrors the "Member Login / Guest Checkout" toggle on the storefront.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        cart = get_or_create_cart(request)
        if not cart.items.exists():
            raise ValidationError("Cart is empty.")

        if not request.user.is_authenticated and not data.get("guest_email"):
            raise ValidationError("guest_email is required for guest checkout.")

        subtotal = cart.total
        discount_total = 0
        coupon_code = data.get("coupon_code", "")
        if coupon_code:
            try:
                coupon = Coupon.objects.get(code=coupon_code, active=True)
                discount_total = coupon.amount_off or (subtotal * coupon.percent_off / 100)
            except Coupon.DoesNotExist:
                raise ValidationError("Invalid coupon code.")

        shipping_fee = 0 if subtotal > 5000 else 250
        total = subtotal - discount_total + shipping_fee

        with transaction.atomic():
            order = Order.objects.create(
                user=request.user if request.user.is_authenticated else None,
                guest_email=data.get("guest_email") if not request.user.is_authenticated else None,
                order_number=uuid.uuid4().hex[:10].upper(),
                payment_method=data["payment_method"],
                subtotal=subtotal,
                shipping_fee=shipping_fee,
                discount_total=discount_total,
                total=total,
                shipping_name=data["shipping_name"],
                shipping_phone=data["shipping_phone"],
                shipping_address=data["shipping_address"],
                shipping_city=data["shipping_city"],
                coupon_code=coupon_code,
            )
            for item in cart.items.select_related("product", "product__vendor"):
                OrderItem.objects.create(
                    order=order,
                    vendor=item.product.vendor,
                    product=item.product,
                    product_name=item.product.name,
                    unit_price=item.product.price,
                    quantity=item.quantity,
                )
            cart.items.all().delete()

        # TODO: if payment_method == mpesa, trigger Daraja STK push here.

        # AI fraud check (rule-based; see ai_services.engines.fraud) — flags high-risk
        # orders for the admin AI dashboard without blocking checkout.
        try:
            from ai_services.engines.fraud import score_order
            from ai_services.models import FraudSignal
            result = score_order(order)
            FraudSignal.objects.update_or_create(
                order=order,
                defaults=dict(risk_score=result["risk_score"], reasons=result["reasons"], flagged=result["flagged"]),
            )
        except Exception:
            pass

        # Order-confirmation notification (in-app / email per user preference).
        if order.user_id:
            from notifications.utils import notify
            from notifications.models import Notification
            notify(
                order.user, title=f"Order {order.order_number} placed",
                body=f"Your order of KES {order.total} has been received.",
                category=Notification.Category.ORDER, channel=Notification.Channel.IN_APP,
                link=f"/orders/{order.order_number}",
            )

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class MyOrdersView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Order.objects.all()
    lookup_field = "order_number"


class VendorOrderItemsView(generics.ListAPIView):
    """Vendor dashboard: order items belonging to that vendor's products."""
    serializer_class = None
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        from .serializers import VendorOrderItemSerializer
        if not hasattr(request.user, "vendor_profile"):
            return Response([])
        from .models import OrderItem
        items = OrderItem.objects.filter(vendor=request.user.vendor_profile).select_related("order").order_by("-order__created_at")
        return Response(VendorOrderItemSerializer(items, many=True).data)


class VendorOrderItemUpdateView(generics.UpdateAPIView):
    """Vendor dashboard: update fulfillment_status on one of the vendor's own order items."""
    from .serializers import VendorOrderItemSerializer
    serializer_class = VendorOrderItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not hasattr(self.request.user, "vendor_profile"):
            return OrderItem.objects.none()
        return OrderItem.objects.filter(vendor=self.request.user.vendor_profile)

    def patch(self, request, *args, **kwargs):
        item = self.get_object()
        new_status = request.data.get("fulfillment_status")
        valid = {c[0] for c in OrderItem.FulfillmentStatus.choices}
        if new_status not in valid:
            return Response({"detail": f"fulfillment_status must be one of {sorted(valid)}"}, status=status.HTTP_400_BAD_REQUEST)
        item.fulfillment_status = new_status
        item.save(update_fields=["fulfillment_status"])
        return Response(self.get_serializer(item).data)
