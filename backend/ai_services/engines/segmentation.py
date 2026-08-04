"""Customer segmentation (RFM) and churn prediction.

Recency/Frequency/Monetary scoring is a standard, explainable segmentation
technique. Churn risk is derived from the same signals with a logistic-style
squashing function — deliberately simple and dependency-free; swap in a
trained sklearn LogisticRegression/GradientBoosting model later by replacing
`_churn_score` while keeping the CustomerSegment model/API stable.
"""
import math
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Max
from accounts.models import User
from orders.models import Order
from ai_services.models import CustomerSegment


def _churn_score(recency_days, frequency, avg_days_between_orders):
    """Higher score = more likely to churn. Recency dominates; low frequency compounds it."""
    recency_factor = min(1.0, recency_days / 180)
    frequency_factor = 1 / (1 + frequency)
    x = 3 * recency_factor + 1.5 * frequency_factor - 1
    return round(1 / (1 + math.exp(-x)), 3)


def _classify(recency_days, frequency, monetary, churn_risk):
    if frequency == 0:
        return CustomerSegment.Segment.NEW
    if churn_risk > 0.75:
        return CustomerSegment.Segment.CHURNED if recency_days > 180 else CustomerSegment.Segment.AT_RISK
    if monetary > 20000 and frequency >= 3:
        return CustomerSegment.Segment.VIP
    if frequency >= 2 and churn_risk < 0.4:
        return CustomerSegment.Segment.LOYAL
    return CustomerSegment.Segment.LOW_VALUE


def recompute_segment(user):
    orders = Order.objects.filter(user=user).exclude(status__in=["cancelled", "pending_payment"])
    agg = orders.aggregate(frequency=Count("id"), monetary=Sum("total"), last=Max("created_at"))
    frequency = agg["frequency"] or 0
    monetary = agg["monetary"] or 0
    last = agg["last"]
    recency_days = (timezone.now() - last).days if last else 999
    avg_gap = (recency_days / frequency) if frequency else recency_days
    churn_risk = _churn_score(recency_days, frequency, avg_gap)
    segment_value = _classify(recency_days, frequency, monetary, churn_risk)

    obj, _ = CustomerSegment.objects.update_or_create(
        user=user,
        defaults=dict(
            segment=segment_value, recency_days=recency_days, frequency=frequency,
            monetary=monetary, churn_risk_score=churn_risk,
        ),
    )
    return obj


def recompute_all_segments(limit=500):
    updated = 0
    for user in User.objects.filter(role="customer")[:limit]:
        recompute_segment(user)
        updated += 1
    return updated
