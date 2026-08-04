"""Dynamic pricing recommendations.

Heuristic engine: nudges price down for slow-moving/overstocked items and up
for high-demand/low-stock items, bounded to a safe +/-15% band. Swap the
`suggest_price` body for a trained elasticity model later.
"""
from datetime import timedelta
from django.utils import timezone
from orders.models import OrderItem
from analytics.models import BehaviorEvent


def suggest_price(product, window_days=30):
    since = timezone.now() - timedelta(days=window_days)
    units_sold = OrderItem.objects.filter(product=product, order__created_at__gte=since).count()
    views = BehaviorEvent.objects.filter(product=product, event_type="product_view", created_at__gte=since).count()

    price = float(product.price)
    conversion = units_sold / views if views else 0
    reasons = []
    adjustment = 0.0

    if product.stock > 0 and units_sold == 0 and views > 20:
        adjustment -= 0.08
        reasons.append("High traffic but no sales in the last month — a price cut may unlock demand.")
    elif product.stock < 5 and units_sold > 10:
        adjustment += 0.07
        reasons.append("Low stock with strong recent demand — price has room to rise before restock.")
    elif conversion > 0.15:
        adjustment += 0.04
        reasons.append("Conversion rate is unusually high — price is likely under market value.")
    elif product.stock > 50 and units_sold < 3:
        adjustment -= 0.1
        reasons.append("Overstocked and slow-moving — recommend a clearance-style discount.")
    else:
        reasons.append("Demand looks stable — no change recommended.")

    adjustment = max(-0.15, min(0.15, adjustment))
    suggested = round(price * (1 + adjustment), 2)
    confidence = min(0.9, 0.4 + views / 200)
    return {
        "product_id": product.id,
        "current_price": price,
        "suggested_price": suggested,
        "change_percent": round(adjustment * 100, 1),
        "reason": reasons[0],
        "confidence": round(confidence, 2),
        "signals": {"units_sold_30d": units_sold, "views_30d": views, "stock": product.stock},
    }
