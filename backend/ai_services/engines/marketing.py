"""Automated marketing recommendations for the admin Promotions module.

Combines segmentation (at-risk/VIP customers) and pricing/forecast signals
(slow-moving stock) into concrete, actionable suggestions an admin can turn
into a Campaign/Coupon with one click.
"""
from ai_services.models import CustomerSegment
from catalog.models import Product
from .pricing import suggest_price


def generate_suggestions(limit=10):
    suggestions = []

    at_risk = CustomerSegment.objects.filter(segment__in=["at_risk", "churned"]).order_by("-monetary")[: limit // 2]
    for seg in at_risk:
        suggestions.append({
            "type": "winback_coupon",
            "title": f"Win back {seg.user.get_username()}",
            "detail": "High churn risk with prior spend — send a personalized discount code.",
            "suggested_action": "10-15% off coupon via email/push",
            "user_id": seg.user_id,
        })

    slow_movers = Product.objects.filter(status=Product.Status.ACTIVE, stock__gt=20).order_by("-stock")[: limit // 2]
    for p in slow_movers:
        pricing = suggest_price(p)
        if pricing["change_percent"] < 0:
            suggestions.append({
                "type": "clearance_campaign",
                "title": f"Clear excess stock: {p.name}",
                "detail": pricing["reason"],
                "suggested_action": f"Feature in homepage banner with {abs(pricing['change_percent'])}% off",
                "product_id": p.id,
            })

    return suggestions[:limit]
