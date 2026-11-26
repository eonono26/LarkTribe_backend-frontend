import uuid
import logging
from decimal import Decimal, ROUND_HALF_UP
from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, views, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, NotFound
from . import mpesa, gateways
from .models import Order, OrderItem, Coupon, MpesaTransaction
from .serializers import OrderSerializer, CheckoutSerializer
from cart.views import get_or_create_cart
from catalog.models import Product, ProductVariant

# Standing incentive to check out signed in rather than as a guest — shown on the
# storefront's Member Login tab and applied here whenever request.user is authenticated.
MEMBER_DISCOUNT_PERCENT = Decimal("5")

logger = logging.getLogger(__name__)
MAX_MPESA_ATTEMPTS_PER_ORDER = 5


def _whole(value) -> Decimal:
    """Round to whole shillings so what the shopper sees is exactly what M-Pesa charges."""
    return Decimal(value).quantize(Decimal("1"), rounding=ROUND_HALF_UP)


class CheckoutView(views.APIView):
    """
    Guest checkout: only guest_email required, no auth.
    Member checkout: request.user is authenticated, guest_email ignored, and gets
    an automatic MEMBER_DISCOUNT_PERCENT off the subtotal — the incentive to
    register/sign in instead of checking out as a guest.
    Mirrors the "Member Login / Guest Checkout" toggle on the storefront.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        method = data["payment_method"]
        if method == Order.PaymentMethod.CARD and not gateways.available_providers():
            raise ValidationError("Card payments are temporarily unavailable. Please pay with M-Pesa or Cash on Delivery.")

        mpesa_phone = ""
        if method == Order.PaymentMethod.MPESA:
            if not mpesa.is_configured():
                raise ValidationError("M-Pesa is temporarily unavailable. Please choose Cash on Delivery.")
            try:
                mpesa_phone = mpesa.normalize_phone(data.get("mpesa_phone") or data["shipping_phone"])
            except mpesa.MpesaError as exc:
                raise ValidationError(str(exc))

        cart = get_or_create_cart(request)
        if not cart.items.exists():
            raise ValidationError("Cart is empty.")

        if not request.user.is_authenticated and not data.get("guest_email"):
            raise ValidationError("guest_email is required for guest checkout.")

        # Re-check stock for the exact color/size in the bag, so something that
        # sold out since it was added is caught here with a clear message
        # instead of becoming an order we can't fulfil.
        for line in cart.items.select_related("product", "variant"):
            available = line.variant.stock if line.variant else line.product.stock
            if line.quantity > available:
                label = (
                    " / ".join(filter(None, [line.variant.color, line.variant.size]))
                    if line.variant else ""
                )
                name = f"{line.product.name} ({label})" if label else line.product.name
                if available <= 0:
                    raise ValidationError(f"{name} is now out of stock. Please remove it from your bag.")
                raise ValidationError(f"Only {available} of {name} left. Please lower the quantity.")

        subtotal = cart.total
        coupon_discount = Decimal("0")
        coupon_code = data.get("coupon_code", "")
        if coupon_code:
            try:
                coupon = Coupon.objects.get(code=coupon_code, active=True)
                coupon_discount = _whole(coupon.amount_off or (subtotal * coupon.percent_off / 100))
            except Coupon.DoesNotExist:
                raise ValidationError("Invalid coupon code.")

        member_discount = (
            _whole(subtotal * MEMBER_DISCOUNT_PERCENT / 100) if request.user.is_authenticated else Decimal("0")
        )
        # Store coupon and member discounts separately; the order detail page
        # renders both rows, so combining them here would display the member
        # discount twice even though the charged total is correct.
        combined_discount = coupon_discount + member_discount

        shipping_fee = 0 if subtotal > 5000 else 250
        if data.get("shipping_lat") is not None and data.get("shipping_lng") is not None:
            # Distance-based fee from the nearest hub (same free-shipping threshold).
            try:
                from integrations.geo import delivery_quote
                shipping_fee = delivery_quote(data["shipping_lat"], data["shipping_lng"], subtotal)["fee"]
            except Exception:
                logger.exception("delivery_quote failed; using flat fee")
        total = subtotal - combined_discount + shipping_fee

        with transaction.atomic():
            order = Order.objects.create(
                user=request.user if request.user.is_authenticated else None,
                guest_email=data.get("guest_email") if not request.user.is_authenticated else None,
                order_number=uuid.uuid4().hex[:10].upper(),
                status=(Order.Status.PROCESSING if data["payment_method"] == Order.PaymentMethod.COD else Order.Status.PENDING_PAYMENT),
                payment_method=data["payment_method"],
                subtotal=subtotal,
                shipping_fee=shipping_fee,
                discount_total=coupon_discount,
                member_discount_total=member_discount,
                total=total,
                shipping_name=data["shipping_name"],
                shipping_phone=data["shipping_phone"],
                shipping_address=data["shipping_address"],
                shipping_city=data["shipping_city"],
                shipping_lat=data.get("shipping_lat"),
                shipping_lng=data.get("shipping_lng"),
                coupon_code=coupon_code,
            )
            for item in cart.items.select_related("product", "variant").select_for_update():
                # Re-check and decrement inventory under a row lock so two
                # simultaneous checkouts cannot sell the same last item.
                if item.variant_id:
                    inventory = ProductVariant.objects.select_for_update().get(pk=item.variant_id)
                else:
                    inventory = Product.objects.select_for_update().get(pk=item.product_id)
                if item.quantity > inventory.stock:
                    raise ValidationError(
                        f"Only {inventory.stock} of {item.product.name} remain. Please update your bag."
                    )
                inventory.stock -= item.quantity
                inventory.save(update_fields=["stock"])

                OrderItem.objects.create(
                    order=order,
                    product=item.product,
                    variant=item.variant,
                    variant_label=(
                        " / ".join(filter(None, [item.variant.color, item.variant.size]))
                        if item.variant else ""
                    ),
                    product_name=item.product.name,
                    unit_price=item.product.price,
                    quantity=item.quantity,
                )
            cart.items.all().delete()

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

        body = OrderSerializer(order).data
        if method == Order.PaymentMethod.CARD:
            body["payment"] = _start_card_payment(order, data.get("card_provider") or None)
        if method == Order.PaymentMethod.MPESA:
            # The order is already saved (pending_payment). If the PIN prompt can't be
            # sent we keep it so the shopper can retry from the order page without
            # losing their bag.
            body["payment"] = _start_mpesa_payment(order, mpesa_phone)
        return Response(body, status=status.HTTP_201_CREATED)


def _start_card_payment(order, preferred=None):
    try:
        res = gateways.create_card_checkout(order, preferred)
        return {"status": "redirect", "provider": res["provider"], "redirect_url": res["redirect_url"],
                "message": "Redirecting you to our secure card payment page…"}
    except gateways.GatewayError as exc:
        return {"status": "error", "message": str(exc)}


def _start_mpesa_payment(order, phone):
    try:
        tx = mpesa.initiate_stk_push(order, phone)
        return {"status": "pending", "phone": tx.phone, "message": "Check your phone and enter your M-Pesa PIN."}
    except mpesa.MpesaError as exc:
        return {"status": "error", "message": str(exc)}


class MpesaCallbackView(views.APIView):
    """Safaricom posts the STK Push result here. Public by necessity, so the URL
    carries a secret token and the CheckoutRequestID must match a pending attempt."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        if token != settings.MPESA_CALLBACK_TOKEN:
            raise NotFound()
        try:
            cb = request.data["Body"]["stkCallback"]
            checkout_id = cb["CheckoutRequestID"]
            code = int(cb["ResultCode"])
        except (KeyError, TypeError, ValueError):
            logger.warning("Malformed M-Pesa callback: %s", request.data)
            return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

        meta = {}
        for item in (cb.get("CallbackMetadata") or {}).get("Item", []):
            meta[item.get("Name")] = item.get("Value")

        mpesa.apply_stk_result(
            checkout_id, code, cb.get("ResultDesc", ""),
            receipt=str(meta.get("MpesaReceiptNumber", "") or ""),
            amount=meta.get("Amount"),
            raw=request.data,
            source="callback",
        )
        # Always acknowledge, otherwise Safaricom keeps retrying.
        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})


def _payment_snapshot(order):
    if order.payment_method == Order.PaymentMethod.CARD:
        if order.status == Order.Status.CANCELLED:
            state, message = "expired", "This order was cancelled because payment was not completed."
        elif order.status == Order.Status.PENDING_PAYMENT:
            state, message = "pending", "Waiting for your card payment to be confirmed…"
        else:
            state, message = "paid", "Payment received. Thank you!"
        return {"order_status": order.status, "payment_status": state, "message": message,
                "receipt": order.payment_reference if state == "paid" else "", "attempts": 1 if order.payment_reference else 0}
    tx = order.mpesa_transactions.first()
    if order.status != Order.Status.PENDING_PAYMENT and order.mpesa_receipt:
        state, message = "paid", "Payment received. Thank you!"
    elif order.status == Order.Status.CANCELLED:
        state, message = "expired", "This order was cancelled because payment was not completed."
    elif tx is None:
        state, message = "none", "No payment started yet."
    elif tx.status == MpesaTransaction.Status.PENDING:
        state, message = "pending", "Waiting for you to enter your M-Pesa PIN…"
    elif tx.status == MpesaTransaction.Status.SUCCESS:
        state, message = "paid", "Payment received. Thank you!"
    elif tx.status == MpesaTransaction.Status.REVIEW:
        state, message = "review", "We received your payment and are confirming it. We'll update this order shortly."
    else:
        state = tx.status  # failed | cancelled
        message = mpesa.friendly_failure(tx.result_code, tx.result_desc)
    return {
        "order_status": order.status,
        "payment_status": state,
        "message": message,
        "receipt": order.mpesa_receipt,
        "attempts": order.mpesa_transactions.count(),
    }


class PaymentStatusView(views.APIView):
    """Polled by the order page while the shopper is on the PIN prompt."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, order_number):
        order = get_object_or_404(Order, order_number=order_number)
        tx = order.mpesa_transactions.first()
        if tx and tx.status == MpesaTransaction.Status.PENDING:
            # Fallback for when the callback can't reach us (local dev, outage):
            # ask Daraja directly, at most once every 6 seconds per attempt.
            key = f"mpesa-q-{tx.pk}"
            if cache.add(key, 1, timeout=6) and (timezone.now() - tx.created_at).total_seconds() > 8:
                try:
                    mpesa.query_stk_status(tx)
                except mpesa.MpesaError:
                    pass
                order.refresh_from_db()
        return Response(_payment_snapshot(order))


class PayWithCardView(views.APIView):
    """(Re)start card payment for an unpaid card order - e.g. shopper closed the tab, or Stripe was down."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, order_number):
        order = get_object_or_404(Order, order_number=order_number)
        if order.status != Order.Status.PENDING_PAYMENT or order.payment_method != Order.PaymentMethod.CARD:
            raise ValidationError("This order isn't waiting for a card payment.")
        if gateways.reconcile(order):  # maybe they already paid
            order.refresh_from_db()
            return Response({**_payment_snapshot(order), "payment": {"status": "paid"}})
        preferred = request.data.get("card_provider") or None
        return Response({**_payment_snapshot(order), "payment": _start_card_payment(order, preferred)})


class CardVerifyView(views.APIView):
    """Called by the order page when the shopper returns from the hosted payment page."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, order_number):
        order = get_object_or_404(Order, order_number=order_number)
        if order.payment_method == Order.PaymentMethod.CARD and order.status == Order.Status.PENDING_PAYMENT:
            gateways.reconcile(order)
            order.refresh_from_db()
        return Response(_payment_snapshot(order))


class StripeWebhookView(views.APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        raw = request.body
        if not gateways.verify_stripe_signature(raw, request.META.get("HTTP_STRIPE_SIGNATURE", "")):
            return Response({"detail": "bad signature"}, status=400)
        import json
        try:
            event = json.loads(raw)
        except ValueError:
            return Response(status=400)
        if event.get("type") in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
            obj = event["data"]["object"]
            if obj.get("payment_status") == "paid":
                order = Order.objects.filter(order_number=obj.get("client_reference_id")).first()
                if order:
                    gateways.mark_paid(order, "stripe", obj.get("payment_intent") or obj.get("id"), obj.get("amount_total"))
        return Response({"received": True})


class PaystackWebhookView(views.APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        raw = request.body
        if not gateways.verify_paystack_signature(raw, request.META.get("HTTP_X_PAYSTACK_SIGNATURE", "")):
            return Response({"detail": "bad signature"}, status=400)
        import json
        try:
            event = json.loads(raw)
        except ValueError:
            return Response(status=400)
        if event.get("event") == "charge.success":
            d = event.get("data", {})
            ref = d.get("reference", "")
            order = (Order.objects.filter(payment_reference=ref).first()
                     or Order.objects.filter(order_number=(d.get("metadata") or {}).get("order_number")).first())
            if order and d.get("status") == "success":
                gateways.mark_paid(order, "paystack", ref, d.get("amount"))
        return Response({"received": True})


class PayWithMpesaView(views.APIView):
    """(Re)send the PIN prompt for an unpaid M-Pesa order."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, order_number):
        order = get_object_or_404(Order, order_number=order_number)
        if order.status != Order.Status.PENDING_PAYMENT or order.payment_method != Order.PaymentMethod.MPESA:
            raise ValidationError("This order isn't waiting for an M-Pesa payment.")
        if order.mpesa_transactions.count() >= MAX_MPESA_ATTEMPTS_PER_ORDER:
            raise ValidationError("Too many payment attempts. Please contact support or place a new order.")

        last = order.mpesa_transactions.first()
        if last and last.status == MpesaTransaction.Status.PENDING:
            try:
                mpesa.query_stk_status(last)
            except mpesa.MpesaError:
                pass
            order.refresh_from_db()
            last.refresh_from_db()
            if order.status != Order.Status.PENDING_PAYMENT:
                return Response(_payment_snapshot(order))
            if last.status == MpesaTransaction.Status.PENDING and (timezone.now() - last.created_at).total_seconds() < 90:
                raise ValidationError("A prompt was just sent. Enter your PIN on your phone, or wait a minute to try again.")

        try:
            phone = mpesa.normalize_phone(request.data.get("phone") or order.shipping_phone)
            mpesa.initiate_stk_push(order, phone)
        except mpesa.MpesaError as exc:
            raise ValidationError(str(exc))
        return Response(_payment_snapshot(order))


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
