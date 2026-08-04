from django.conf import settings
from django.db import models


class BehaviorEvent(models.Model):
    """Single user-behavior event. Powers recommendations, marketing, and admin reports.

    Covers every signal listed in the spec: views, search, clicks, wishlist,
    cart add/remove, checkout abandonment, purchases, time on page, device,
    browser/app version, location (consented), campaign/referral source,
    favourite brand/category signals, and AI-recommendation interactions.
    """

    class EventType(models.TextChoices):
        PRODUCT_VIEW = "product_view", "Product view"
        SEARCH = "search", "Search"
        CLICK = "click", "Click"
        WISHLIST_ADD = "wishlist_add", "Wishlist add"
        WISHLIST_REMOVE = "wishlist_remove", "Wishlist remove"
        CART_ADD = "cart_add", "Add to cart"
        CART_REMOVE = "cart_remove", "Remove from cart"
        CHECKOUT_START = "checkout_start", "Checkout started"
        CHECKOUT_ABANDON = "checkout_abandon", "Checkout abandoned"
        PURCHASE = "purchase", "Purchase"
        PAGE_TIME = "page_time", "Time spent on page"
        RECOMMENDATION_IMPRESSION = "recommendation_impression", "AI recommendation shown"
        RECOMMENDATION_CLICK = "recommendation_click", "AI recommendation clicked"

    class DeviceType(models.TextChoices):
        MOBILE = "mobile", "Mobile"
        DESKTOP = "desktop", "Desktop"
        TABLET = "tablet", "Tablet"
        APP_ANDROID = "app_android", "Android app"
        APP_IOS = "app_ios", "iOS app"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="behavior_events")
    session_key = models.CharField(max_length=64, db_index=True, blank=True)
    event_type = models.CharField(max_length=30, choices=EventType.choices, db_index=True)
    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, null=True, blank=True, related_name="behavior_events")
    category = models.ForeignKey("catalog.Category", on_delete=models.SET_NULL, null=True, blank=True)
    brand = models.ForeignKey("catalog.Brand", on_delete=models.SET_NULL, null=True, blank=True)
    search_query = models.CharField(max_length=255, blank=True)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True, help_text="Used by page_time events.")
    device_type = models.CharField(max_length=20, choices=DeviceType.choices, blank=True)
    browser = models.CharField(max_length=100, blank=True)
    app_version = models.CharField(max_length=20, blank=True)
    city = models.CharField(max_length=100, blank=True, help_text="Coarse location, collected only with user consent.")
    campaign_source = models.CharField(max_length=100, blank=True, help_text="utm_source / referral")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event_type", "created_at"]),
            models.Index(fields=["user", "event_type"]),
        ]

    def __str__(self):
        return f"{self.event_type} @ {self.created_at:%Y-%m-%d %H:%M}"


class DailyMetric(models.Model):
    """Rolled-up daily numbers for the admin Reports & Analytics dashboard."""

    date = models.DateField(unique=True)
    sessions = models.PositiveIntegerField(default=0)
    product_views = models.PositiveIntegerField(default=0)
    searches = models.PositiveIntegerField(default=0)
    add_to_cart = models.PositiveIntegerField(default=0)
    checkouts_started = models.PositiveIntegerField(default=0)
    checkouts_abandoned = models.PositiveIntegerField(default=0)
    orders_placed = models.PositiveIntegerField(default=0)
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ["-date"]
