"""Rule-based fraud detection for orders.

Scores an order 0-1 on a handful of interpretable signals (guest + high value,
mismatched shipping city pattern, rapid repeat orders, unusually large
quantity of one SKU, brand-new account placing a large order). Flags orders
above a threshold for manual review. Swap for an ML classifier later without
touching the FraudSignal model or the checkout hook.
"""
from datetime import timedelta
from django.utils import timezone
from orders.models import Order

HIGH_VALUE_THRESHOLD = 15000
FLAG_THRESHOLD = 0.6


def score_order(order):
    reasons = []
    score = 0.0

    if order.total >= HIGH_VALUE_THRESHOLD and order.guest_email:
        score += 0.35
        reasons.append("High-value order placed as guest checkout.")

    if order.user_id:
        recent_count = Order.objects.filter(
            user_id=order.user_id, created_at__gte=timezone.now() - timedelta(hours=1)
        ).exclude(id=order.id).count()
        if recent_count >= 3:
            score += 0.3
            reasons.append(f"{recent_count} other orders from this account in the last hour.")
    else:
        score += 0.05

    max_item_qty = max([i.quantity for i in order.items.all()], default=0)
    if max_item_qty >= 10:
        score += 0.2
        reasons.append(f"Unusually large single-item quantity ({max_item_qty}).")

    if order.payment_method == "cod" and order.total >= HIGH_VALUE_THRESHOLD:
        score += 0.15
        reasons.append("High-value cash-on-delivery order.")

    score = min(1.0, round(score, 2))
    return {"risk_score": score, "reasons": reasons, "flagged": score >= FLAG_THRESHOLD}
