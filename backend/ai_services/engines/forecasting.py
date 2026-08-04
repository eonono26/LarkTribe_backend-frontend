"""Sales forecasting and inventory (reorder) forecasting.

Uses a simple weighted moving average over recent weekly sales — no numpy/
sklearn required so it runs anywhere. It's easy to replace with
statsmodels/Prophet or an sklearn regressor later; only this module needs to
change, `views.py` just calls `forecast_product_demand`.
"""
from datetime import timedelta
from collections import defaultdict
from django.utils import timezone
from orders.models import OrderItem


def _weekly_sales(product, weeks=8):
    since = timezone.now() - timedelta(weeks=weeks)
    items = OrderItem.objects.filter(product=product, order__created_at__gte=since).select_related("order")
    buckets = defaultdict(int)
    for item in items:
        week = item.order.created_at.isocalendar()[1]
        buckets[week] += item.quantity
    return [buckets[w] for w in sorted(buckets.keys())] or [0]


def forecast_product_demand(product, weeks_ahead=1):
    """Weighted moving average forecast + a simple reorder-point recommendation."""
    history = _weekly_sales(product)
    if len(history) == 1:
        forecast = history[0]
    else:
        weights = list(range(1, len(history) + 1))
        forecast = sum(h * w for h, w in zip(history, weights)) / sum(weights)

    forecast_units = round(forecast * weeks_ahead, 1)
    lead_time_weeks = 2
    safety_stock = round(forecast * 0.5)
    reorder_point = round(forecast * lead_time_weeks + safety_stock)
    reorder_recommended = product.stock <= reorder_point
    reorder_quantity = max(0, reorder_point + round(forecast * 2) - product.stock) if reorder_recommended else 0

    return {
        "product_id": product.id,
        "weekly_history": history,
        "forecast_units_next_period": forecast_units,
        "current_stock": product.stock,
        "reorder_point": reorder_point,
        "reorder_recommended": reorder_recommended,
        "reorder_quantity": reorder_quantity,
    }


def sales_forecast_overview(days_ahead=7):
    """Platform-wide revenue trend + naive next-period projection for the AI dashboard."""
    since = timezone.now() - timedelta(weeks=8)
    items = OrderItem.objects.filter(order__created_at__gte=since).select_related("order")
    weekly = defaultdict(float)
    for item in items:
        week = item.order.created_at.isocalendar()[1]
        weekly[week] += float(item.subtotal)
    ordered = [weekly[w] for w in sorted(weekly.keys())] or [0]
    avg_recent = sum(ordered[-3:]) / len(ordered[-3:]) if ordered else 0
    return {
        "weekly_revenue_history": ordered,
        "projected_next_week_revenue": round(avg_recent, 2),
    }
