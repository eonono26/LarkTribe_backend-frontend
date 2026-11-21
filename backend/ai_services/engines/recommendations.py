"""Personalized recommendations, similar products, and frequently-bought-together.

Implemented as fast, dependency-free heuristics (content-based filtering on
category/brand/price + co-purchase counts) so they run with zero extra
infrastructure. The interfaces are deliberately small so a real model
(matrix factorization, a learned embedding index, etc.) can be swapped in
behind `recommend_for_user` / `similar_products` / `frequently_bought_with`
without touching the calling views.
"""
from collections import Counter
from django.utils import timezone
from django.db.models import Q
from catalog.models import Product
from orders.models import Order, OrderItem
from analytics.models import BehaviorEvent


def _active():
    return Product.objects.filter(status=Product.Status.ACTIVE)


def similar_products(product, limit=8):
    """Content-based: same category first, then same brand, ranked by price proximity + rating."""
    qs = _active().exclude(id=product.id).filter(
        Q(category=product.category) | Q(brand=product.brand)
    )
    scored = []
    for p in qs.select_related("brand", "category")[:200]:
        score = 0
        if p.category_id == product.category_id:
            score += 3
        if product.brand_id and p.brand_id == product.brand_id:
            score += 2
        price_diff = abs(float(p.price) - float(product.price))
        score += max(0, 1 - price_diff / max(float(product.price), 1))
        score += float(p.rating_avg) * 0.2
        scored.append((score, p))
    scored.sort(key=lambda t: t[0], reverse=True)
    return [p for _, p in scored[:limit]]


def frequently_bought_with(product, limit=6):
    """Market-basket co-occurrence: products that appear in the same orders as this one."""
    order_ids = OrderItem.objects.filter(product=product).values_list("order_id", flat=True)
    co_items = (
        OrderItem.objects.filter(order_id__in=order_ids)
        .exclude(product=product)
        .values_list("product_id", flat=True)
    )
    counts = Counter(co_items)
    top_ids = [pid for pid, _ in counts.most_common(limit)]
    if not top_ids:
        return similar_products(product, limit)
    products = list(_active().filter(id__in=top_ids))
    products.sort(key=lambda p: top_ids.index(p.id))
    return products


def recommend_for_user(user=None, session_key="", limit=12):
    """Rank products from weighted recent behavior and completed purchase history."""
    events = BehaviorEvent.objects.none()
    if user and user.is_authenticated:
        events = BehaviorEvent.objects.filter(user=user)
    elif session_key:
        events = BehaviorEvent.objects.filter(session_key=session_key)

    event_weights = {
        "product_view": 1.0,
        "click": 1.25,
        "wishlist_add": 3.0,
        "cart_add": 4.0,
        "checkout_start": 5.0,
        "purchase": 6.0,
        "recommendation_impression": 0.25,
        "recommendation_click": 2.0,
        "wishlist_remove": -1.5,
        "cart_remove": -1.0,
    }
    recent_events = list(
        events.exclude(product__isnull=True)
        .filter(event_type__in=event_weights)
        .values_list("product_id", "product__category_id", "product__brand_id", "event_type", "created_at")[:400]
    )
    purchased_products = []
    if user and user.is_authenticated:
        purchased_products = list(
            OrderItem.objects.filter(order__user=user)
            .filter(order__status__in=[
                Order.Status.PAID,
                Order.Status.PROCESSING,
                Order.Status.SHIPPED,
                Order.Status.DELIVERED,
            ])
            .order_by("-order__created_at")
            .values_list("product_id", "product__category_id", "product__brand_id", "order__created_at")[:200]
        )

    if not recent_events and not purchased_products:
        return list(_active().order_by("-is_featured", "-rating_avg", "-created_at")[:limit])

    category_scores = Counter()
    brand_scores = Counter()
    seen_ids = set()
    now = timezone.now()
    for product_id, category_id, brand_id, event_type, created_at in recent_events:
        seen_ids.add(product_id)
        age_days = max((now - created_at).total_seconds() / 86400, 0)
        recency = 0.5 ** (age_days / 30)
        weight = event_weights[event_type] * recency
        if category_id:
            category_scores[category_id] += weight
        if brand_id:
            brand_scores[brand_id] += weight

    for product_id, category_id, brand_id, purchased_at in purchased_products:
        seen_ids.add(product_id)
        age_days = max((now - purchased_at).total_seconds() / 86400, 0)
        weight = event_weights["purchase"] * 0.5 ** (age_days / 90)
        if category_id:
            category_scores[category_id] += weight
        if brand_id:
            brand_scores[brand_id] += weight

    top_categories = [category_id for category_id, score in category_scores.most_common(5) if score > 0]
    top_brands = [brand_id for brand_id, score in brand_scores.most_common(5) if score > 0]

    candidates = _active().exclude(id__in=seen_ids).select_related("category", "brand")
    if top_categories or top_brands:
        candidates = candidates.filter(
            Q(category_id__in=top_categories) | Q(brand_id__in=top_brands)
        )[:300]
    else:
        candidates = candidates.none()

    scored = []
    for p in candidates:
        score = 0.0
        score += category_scores[p.category_id] if p.category_id else 0
        score += brand_scores[p.brand_id] if p.brand_id else 0
        score += float(p.rating_avg) * 0.5
        scored.append((score, p))
    scored.sort(key=lambda t: t[0], reverse=True)
    results = [p for _, p in scored[:limit]]

    if len(results) < limit:
        filler = _active().exclude(id__in=seen_ids).exclude(id__in=[p.id for p in results]).order_by("-is_featured", "-rating_avg")
        results += list(filler[: limit - len(results)])
    return results
