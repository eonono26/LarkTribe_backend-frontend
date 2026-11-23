"""Distance, nearest-city and delivery quoting. Pure Python, no external geocoder."""
import math
from decimal import Decimal

# Major Kenyan towns for "Popular in <city>" and city analytics.
KENYA_CITIES = {
    "Nairobi": (-1.286389, 36.817223), "Mombasa": (-4.043477, 39.668206), "Kisumu": (-0.091702, 34.767956),
    "Nakuru": (-0.303099, 36.080026), "Eldoret": (0.514277, 35.269780), "Thika": (-1.033260, 37.069330),
    "Kiambu": (-1.171400, 36.835500), "Machakos": (-1.516830, 37.263400), "Nyeri": (-0.420130, 36.947600),
    "Malindi": (-3.219220, 40.116940), "Kitale": (1.015700, 35.006200), "Kakamega": (0.282700, 34.751900),
    "Naivasha": (-0.717200, 36.431000), "Meru": (0.047000, 37.649800), "Kisii": (-0.681700, 34.766700),
}
DEFAULT_HUB = ("LarkTribe Hub, Nairobi", -1.286389, 36.817223, "Nairobi")


def haversine_km(lat1, lng1, lat2, lng2):
    r = 6371.0
    p1, p2 = math.radians(float(lat1)), math.radians(float(lat2))
    dphi = p2 - p1
    dl = math.radians(float(lng2) - float(lng1))
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def nearest_city(lat, lng, max_km=80):
    best = min(KENYA_CITIES.items(), key=lambda kv: haversine_km(lat, lng, kv[1][0], kv[1][1]))
    return best[0] if haversine_km(lat, lng, *best[1]) <= max_km else None


def nearest_pickup(lat, lng):
    from .models import PickupPoint
    points = list(PickupPoint.objects.filter(is_active=True))
    if not points:
        name, plat, plng, city = DEFAULT_HUB
        return {"id": None, "name": name, "address": "", "city": city, "lat": plat, "lng": plng,
                "opening_hours": "Mon-Sat 9:00-18:00", "distance_km": round(haversine_km(lat, lng, plat, plng), 1)}
    p = min(points, key=lambda x: haversine_km(lat, lng, x.lat, x.lng))
    return {"id": p.id, "name": p.name, "address": p.address, "city": p.city, "lat": float(p.lat), "lng": float(p.lng),
            "opening_hours": p.opening_hours, "distance_km": round(haversine_km(lat, lng, p.lat, p.lng), 1)}


# (max distance km, fee KES, eta label)
BANDS = [
    (10, 200, "Same day or next day"),
    (25, 300, "1 day"),
    (60, 450, "1-2 days"),
    (250, 650, "2-3 days"),
    (10_000, 850, "3-5 days"),
]
FREE_SHIPPING_OVER = 5000


def delivery_quote(lat, lng, subtotal=0):
    """Fee + ETA from the nearest hub to the drop-off coordinate."""
    hub = nearest_pickup(lat, lng)
    km = hub["distance_km"]
    for limit, fee, eta in BANDS:
        if km <= limit:
            break
    free = Decimal(str(subtotal or 0)) > FREE_SHIPPING_OVER
    return {
        "distance_km": km, "fee": 0 if free else fee, "standard_fee": fee, "free_shipping": free,
        "eta": eta, "pickup_point": hub, "city": nearest_city(lat, lng),
    }
