"""
Card gateways (Proposal item 7): Stripe primary, Paystack backup.

Both use hosted checkout pages, so card details never touch our servers (PCI
scope stays minimal). Flow:
  1. CheckoutView creates the Order (pending_payment) and calls create_card_checkout().
  2. Shopper pays on the provider's page and is redirected back to /orders/<n>.
  3. The provider's webhook AND the order page's /card/verify/ call both land in
     mark_paid(), which is idempotent and amount-checked.
No provider SDKs are required - plain HTTPS via requests.
"""
import hashlib
import hmac
import logging
import time
import uuid
from decimal import Decimal, ROUND_HALF_UP

import requests
from django.conf import settings
from django.db import transaction

logger = logging.getLogger(__name__)
TIMEOUT = 20


class GatewayError(Exception):
    """Message is safe to show to the shopper."""


def available_providers():
    out = []
    for p in settings.CARD_PROVIDERS:
        if p == "stripe" and settings.STRIPE_SECRET_KEY:
            out.append("stripe")
        elif p == "paystack" and settings.PAYSTACK_SECRET_KEY:
            out.append("paystack")
    return out


def _minor(total) -> int:
    """KES (like USD) uses 2 decimals at both Stripe and Paystack: amount in cents."""
    return int((Decimal(total) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _email(order):
    if order.user_id and order.user.email:
        return order.user.email
    return order.guest_email or "customer@larktribe.co.ke"


# ---------------------------------------------------------------- Stripe
def _stripe_create(order):
    n = order.order_number
    data = {
        "mode": "payment",
        "success_url": f"{settings.FRONTEND_URL}/orders/{n}?card=return&session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{settings.FRONTEND_URL}/orders/{n}?card=cancelled",
        "client_reference_id": n,
        "customer_email": _email(order),
        "metadata[order_number]": n,
        "payment_intent_data[metadata][order_number]": n,
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": settings.STRIPE_CURRENCY,
        "line_items[0][price_data][unit_amount]": str(_minor(order.total)),
        "line_items[0][price_data][product_data][name]": f"LarkTribe order {n}",
    }
    try:
        r = requests.post("https://api.stripe.com/v1/checkout/sessions", data=data,
                          headers={"Authorization": f"Bearer {settings.STRIPE_SECRET_KEY}"}, timeout=TIMEOUT)
    except requests.RequestException:
        raise GatewayError("Card payment (Stripe) is unreachable right now.")
    if r.status_code != 200:
        logger.error("Stripe session error %s: %s", r.status_code, r.text[:300])
        raise GatewayError("Stripe couldn't start this payment.")
    j = r.json()
    return {"provider": "stripe", "redirect_url": j["url"], "reference": j["id"]}


def _stripe_verify(order):
    ref = order.payment_reference
    if not ref.startswith("cs_"):
        return False
    r = requests.get(f"https://api.stripe.com/v1/checkout/sessions/{ref}",
                     headers={"Authorization": f"Bearer {settings.STRIPE_SECRET_KEY}"}, timeout=TIMEOUT)
    if r.status_code != 200:
        return False
    j = r.json()
    if j.get("payment_status") == "paid" and j.get("client_reference_id") == order.order_number:
        return mark_paid(order, "stripe", j.get("payment_intent") or ref, j.get("amount_total"))
    return False


def verify_stripe_signature(payload: bytes, header: str, tolerance=300) -> bool:
    secret = settings.STRIPE_WEBHOOK_SECRET
    if not secret or not header:
        return False
    try:
        parts = dict(kv.split("=", 1) for kv in header.split(",") if "=" in kv)
        ts = parts["t"]
        sigs = [v for k, v in (kv.split("=", 1) for kv in header.split(",") if "=" in kv) if k == "v1"]
    except (KeyError, ValueError):
        return False
    if abs(time.time() - int(ts)) > tolerance:
        return False
    expected = hmac.new(secret.encode(), f"{ts}.".encode() + payload, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, s) for s in sigs)


# -------------------------------------------------------------- Paystack
def _paystack_create(order):
    n = order.order_number
    ref = f"{n}-{uuid.uuid4().hex[:6]}"
    body = {
        "email": _email(order), "amount": _minor(order.total), "currency": settings.PAYSTACK_CURRENCY,
        "reference": ref, "callback_url": f"{settings.FRONTEND_URL}/orders/{n}?card=return",
        "metadata": {"order_number": n},
    }
    try:
        r = requests.post("https://api.paystack.co/transaction/initialize", json=body,
                          headers={"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"}, timeout=TIMEOUT)
    except requests.RequestException:
        raise GatewayError("Card payment (Paystack) is unreachable right now.")
    j = r.json() if r.content else {}
    if r.status_code != 200 or not j.get("status"):
        logger.error("Paystack init error %s: %s", r.status_code, r.text[:300])
        raise GatewayError("Paystack couldn't start this payment.")
    return {"provider": "paystack", "redirect_url": j["data"]["authorization_url"], "reference": ref}


def _paystack_verify(order):
    ref = order.payment_reference
    if not ref:
        return False
    r = requests.get(f"https://api.paystack.co/transaction/verify/{ref}",
                     headers={"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"}, timeout=TIMEOUT)
    j = r.json() if r.content else {}
    d = j.get("data") or {}
    if r.status_code == 200 and d.get("status") == "success":
        return mark_paid(order, "paystack", ref, d.get("amount"))
    return False


def verify_paystack_signature(payload: bytes, header: str) -> bool:
    if not settings.PAYSTACK_SECRET_KEY or not header:
        return False
    expected = hmac.new(settings.PAYSTACK_SECRET_KEY.encode(), payload, hashlib.sha512).hexdigest()
    return hmac.compare_digest(expected, header)


# --------------------------------------------------------------- shared
def create_card_checkout(order, preferred=None):
    """Start a hosted payment. If the preferred provider fails, fall back to the
    next configured one so the shopper is never blocked. Saves provider+reference."""
    providers = available_providers()
    if not providers:
        raise GatewayError("Card payments aren't available right now. Please use M-Pesa or Cash on Delivery.")
    if preferred in providers:
        providers = [preferred] + [p for p in providers if p != preferred]
    last = None
    for p in providers:
        try:
            res = _stripe_create(order) if p == "stripe" else _paystack_create(order)
        except GatewayError as exc:
            last = exc
            continue
        order.payment_provider = res["provider"]
        order.payment_reference = res["reference"]
        order.save(update_fields=["payment_provider", "payment_reference", "updated_at"])
        return res
    raise last or GatewayError("Card payment couldn't be started.")


def mark_paid(order, provider, reference, amount_minor=None) -> bool:
    """Idempotent: moves a pending order to PAID once. Rejects short payments."""
    from .models import Order
    with transaction.atomic():
        o = Order.objects.select_for_update().get(pk=order.pk)
        if amount_minor is not None and int(amount_minor) < _minor(o.total):
            logger.error("Card amount mismatch on %s: paid %s expected %s", o.order_number, amount_minor, _minor(o.total))
            return False
        if o.status != Order.Status.PENDING_PAYMENT:
            if o.status == Order.Status.CANCELLED:
                logger.error("Card payment %s received for CANCELLED order %s - refund or reinstate.", reference, o.order_number)
            return o.status != Order.Status.CANCELLED
        o.status = Order.Status.PAID
        o.payment_provider = provider
        o.payment_reference = str(reference)[:120]
        o.save(update_fields=["status", "payment_provider", "payment_reference", "updated_at"])  # signal notifies shopper
    return True


def reconcile(order) -> bool:
    """Ask the provider whether this order was paid (return-page verify + expiry sweep)."""
    try:
        if order.payment_provider == "stripe" and settings.STRIPE_SECRET_KEY:
            return _stripe_verify(order)
        if order.payment_provider == "paystack" and settings.PAYSTACK_SECRET_KEY:
            return _paystack_verify(order)
    except requests.RequestException:
        logger.exception("Card reconcile failed for %s", order.order_number)
    return False
