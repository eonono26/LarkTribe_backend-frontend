import csv
from decimal import Decimal, InvalidOperation
from xml.sax.saxutils import escape

from django.conf import settings
from django.db.models import Count
from django.http import HttpResponse
from rest_framework import permissions, views
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from catalog.models import Product
from . import geo
from .models import LocationEvent, PickupPoint


def _card_providers():
    out = []
    for p in settings.CARD_PROVIDERS:
        if p == "stripe" and settings.STRIPE_SECRET_KEY:
            out.append("stripe")
        elif p == "paystack" and settings.PAYSTACK_SECRET_KEY:
            out.append("paystack")
    return out


class PublicConfigView(views.APIView):
    """Everything the storefront / app needs to switch features on, in one call."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from orders import mpesa
        return Response({
            "meta_pixel_id": settings.META_PIXEL_ID,
            "tiktok_pixel_id": settings.TIKTOK_PIXEL_ID,
            "whatsapp_number": settings.WHATSAPP_NUMBER,
            "social": {
                "instagram": settings.SOCIAL_INSTAGRAM_URL, "facebook": settings.SOCIAL_FACEBOOK_URL,
                "tiktok": settings.SOCIAL_TIKTOK_URL,
            },
            "payments": {"mpesa": mpesa.is_configured(), "card_providers": _card_providers(), "cod": True},
            "features": {"tryon": True, "viewer_360": True, "geolocation": True},
        })


def _coords(request):
    try:
        lat, lng = float(request.query_params["lat"]), float(request.query_params["lng"])
    except (KeyError, ValueError):
        raise ValidationError("lat and lng are required.")
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise ValidationError("Invalid coordinates.")
    return lat, lng


class DeliveryEstimateView(views.APIView):
    """GET ?lat&lng[&subtotal] -> distance, delivery fee, ETA, nearest pickup point. Used only after the shopper allows location."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        lat, lng = _coords(request)
        try:
            subtotal = Decimal(request.query_params.get("subtotal", "0"))
        except InvalidOperation:
            subtotal = Decimal("0")
        return Response(geo.delivery_quote(lat, lng, subtotal))


class PickupPointsView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        pts = [{"id": p.id, "name": p.name, "address": p.address, "city": p.city, "lat": float(p.lat),
                "lng": float(p.lng), "opening_hours": p.opening_hours} for p in PickupPoint.objects.filter(is_active=True)]
        if "lat" in request.query_params:
            lat, lng = _coords(request)
            for p in pts:
                p["distance_km"] = round(geo.haversine_km(lat, lng, p["lat"], p["lng"]), 1)
            pts.sort(key=lambda p: p["distance_km"])
        return Response(pts)


class LocationPingView(views.APIView):
    """POST {lat,lng} - ONLY called after the shopper consents. Stores city + ~1km-rounded coords, nothing personal."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            lat, lng = float(request.data["lat"]), float(request.data["lng"])
        except (KeyError, TypeError, ValueError):
            raise ValidationError("lat and lng are required.")
        city = geo.nearest_city(lat, lng) or "Other"
        LocationEvent.objects.create(city=city, lat=round(lat, 2), lng=round(lng, 2))
        return Response({"city": city})


class PopularNearView(views.APIView):
    """GET ?city=Nairobi or ?lat&lng -> products most ordered for that city ("Popular in Nairobi")."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        city = request.query_params.get("city")
        if not city and "lat" in request.query_params:
            lat, lng = _coords(request)
            city = geo.nearest_city(lat, lng)
        if not city:
            return Response({"city": None, "results": []})
        from orders.models import OrderItem
        ids = list(
            OrderItem.objects.filter(order__shipping_city__icontains=city)
            .values("product").annotate(n=Count("id")).order_by("-n").values_list("product", flat=True)[:12]
        )
        from catalog.serializers import ProductListSerializer
        by_id = {p.id: p for p in Product.objects.filter(pk__in=ids, status=Product.Status.ACTIVE)}
        ordered = [by_id[i] for i in ids if i in by_id]
        return Response({"city": city, "results": ProductListSerializer(ordered, many=True, context={"request": request}).data})


class AdminLocationStatsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        rows = LocationEvent.objects.values("city").annotate(visits=Count("id")).order_by("-visits")[:20]
        return Response(list(rows))


# ---------------------------------------------------------------------------
# Product feeds for Facebook / Instagram Shop and TikTok catalogue
# ---------------------------------------------------------------------------
def _feed_products(request):
    if settings.FEED_TOKEN and request.GET.get("token") != settings.FEED_TOKEN:
        return None
    return (Product.objects.filter(status=Product.Status.ACTIVE)
            .select_related("brand", "category").prefetch_related("images", "variants"))


def _feed_row(p, request):
    img = next(iter(sorted([i for i in p.images.all() if i.image], key=lambda i: (not i.is_primary, i.order, i.id))), None)
    return {
        "id": str(p.pk), "title": p.name[:150], "description": (p.description or p.name)[:5000],
        "availability": "in stock" if p.stock > 0 or any(v.stock > 0 for v in p.variants.all()) else "out of stock",
        "condition": "new", "price": f"{p.compare_at_price or p.price} KES",
        "sale_price": f"{p.price} KES" if p.compare_at_price and p.compare_at_price > p.price else "",
        "link": f"{settings.FRONTEND_URL}/product/{p.slug}",
        "image_link": request.build_absolute_uri(img.image.url) if img else "",
        "brand": p.brand.name if p.brand else "LarkTribe",
        "google_product_category": "Apparel & Accessories",
        "product_type": p.category.name if p.category else "",
        "gender": {"girls": "female", "boys": "male"}.get(p.gender, "unisex"),
    }


class MetaFeedCsvView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = _feed_products(request)
        if qs is None:
            return HttpResponse("Forbidden", status=403)
        resp = HttpResponse(content_type="text/csv")
        rows = [_feed_row(p, request) for p in qs]
        cols = ["id", "title", "description", "availability", "condition", "price", "sale_price", "link",
                "image_link", "brand", "google_product_category", "product_type", "gender"]
        w = csv.DictWriter(resp, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
        return resp


class MetaFeedXmlView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = _feed_products(request)
        if qs is None:
            return HttpResponse("Forbidden", status=403)
        items = []
        for p in qs:
            r = _feed_row(p, request)
            fields = "".join(f"<g:{k}>{escape(v)}</g:{k}>" for k, v in r.items() if v and k not in ("title", "link", "description"))
            items.append(f"<item><title>{escape(r['title'])}</title><link>{escape(r['link'])}</link>"
                         f"<description>{escape(r['description'])}</description>{fields}</item>")
        xml = ('<?xml version="1.0" encoding="UTF-8"?><rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel>'
               "<title>LarkTribe</title>" f"<link>{escape(settings.FRONTEND_URL)}</link><description>LarkTribe catalogue</description>"
               + "".join(items) + "</channel></rss>")
        return HttpResponse(xml, content_type="application/xml")
