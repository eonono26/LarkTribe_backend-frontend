"""Personalized recommendations, similar products, and frequently-bought-together.

Implemented as fast, dependency-free heuristics (content-based filtering on
category/brand/price + co-purchase counts) so they run with zero extra
infrastructure. The interfaces are deliberately small so a real model
(matrix factorization, a learned embedding index, etc.) can be swapped in
behind `recommend_for_user` / `similar_products` / `frequently_bought_with`
without touching the calling views.
"""
from collections import Counter
from django.db.models import Q
from catalog.models import Product
from orders.models import OrderItem
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
    """Personalized feed: blends recent behavior (views, cart, wishlist, search) with
    purchase history. Falls back to trending/featured products for anonymous/new users."""
    events = BehaviorEvent.objects.none()
    if user and user.is_authenticated:
        events = BehaviorEvent.objects.filter(user=user)
    elif session_key:
        events = BehaviorEvent.objects.filter(session_key=session_key)

    interacted_products = list(
        events.exclude(product__isnull=True).values_list("product_id", "product__category_id", "product__brand_id")[:200]
    )

    if not interacted_products:
        return list(_active().order_by("-is_featured", "-rating_avg", "-created_at")[:limit])

    category_counts = Counter(c for _, c, _ in interacted_products if c)
    brand_counts = Counter(b for _, _, b in interacted_products if b)
    seen_ids = {p for p, _, _ in interacted_products}

    top_categories = [c for c, _ in category_counts.most_common(3)]
    top_brands = [b for b, _ in brand_counts.most_common(3)]

    candidates = _active().exclude(id__in=seen_ids).filter(
        Q(category_id__in=top_categories) | Q(brand_id__in=top_brands)
    ).select_related("category", "brand")[:300]

    scored = []
    for p in candidates:
        score = 0.0
        if p.category_id in top_categories:
            score += 2 * category_counts[p.category_id]
        if p.brand_id in top_brands:
            score += 1.5 * brand_counts[p.brand_id]
        score += float(p.rating_avg) * 0.5
        scored.append((score, p))
    scored.sort(key=lambda t: t[0], reverse=True)
    results = [p for _, p in scored[:limit]]

    if len(results) < limit:
        filler = _active().exclude(id__in=seen_ids).exclude(id__in=[p.id for p in results]).order_by("-is_featured", "-rating_avg")
        results += list(filler[: limit - len(results)])
    return results
