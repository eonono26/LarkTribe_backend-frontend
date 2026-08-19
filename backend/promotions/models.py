from django.conf import settings
from django.db import models
from django.utils import timezone


class Campaign(models.Model):
    """Admin/vendor marketing campaign — homepage banners, category pushes, etc.
    Feeds the admin 'Promotions' module and the AI 'automated marketing recommendations' feature."""

    class Placement(models.TextChoices):
        HOMEPAGE_BANNER = "homepage_banner", "Homepage banner"
        CATEGORY_BANNER = "category_banner", "Category banner"
        EMAIL = "email", "Email blast"
        PUSH = "push", "Push notification"

    class Style(models.TextChoices):
        HERO = "hero", "Hero (large image + headline)"
        STRIP = "strip", "Strip (thin announcement bar)"
        SPLIT = "split", "Split (image beside text)"
        COUNTDOWN = "countdown", "Countdown (flash sale with timer)"
        CARD = "card", "Card (compact promo tile)"

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    placement = models.CharField(max_length=20, choices=Placement.choices, default=Placement.HOMEPAGE_BANNER)
    style = models.CharField(max_length=20, choices=Style.choices, default=Style.HERO, help_text="Visual treatment for banner/homepage_banner and category_banner placements.")
    background_color = models.CharField(max_length=20, blank=True, help_text="Optional CSS color, e.g. #FFD400. Falls back to a department/brand color.")
    cta_label = models.CharField(max_length=40, blank=True, default="Shop now")
    image = models.ImageField(upload_to="campaigns/", blank=True, null=True)
    link_url = models.CharField(max_length=255, blank=True)
    department = models.ForeignKey("catalog.Department", on_delete=models.SET_NULL, null=True, blank=True, related_name="campaigns")
    coupon = models.ForeignKey("orders.Coupon", on_delete=models.SET_NULL, null=True, blank=True, related_name="campaigns")
    is_ai_generated = models.BooleanField(default=False, help_text="Suggested by the automated marketing engine.")
    active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    @property
    def is_live(self):
        now = timezone.now()
        if not self.active:
            return False
        if self.ends_at and self.ends_at < now:
            return False
        return self.starts_at <= now


class CouponClaim(models.Model):
    """A coupon a customer has saved to their 'My Coupons' wallet from the public
    coupon list, so it's ready to apply at checkout without retyping the code."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="coupon_claims")
    coupon = models.ForeignKey("orders.Coupon", on_delete=models.CASCADE, related_name="claims")
    claimed_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["user", "coupon"]
        ordering = ["-claimed_at"]

    def __str__(self):
        return f"{self.user} saved {self.coupon.code}"


class ShowcaseVideo(models.Model):
    """Standalone shoppable video content for the homepage 'Watch & shop' rail.
    Independent of DepartmentMedia/CategoryMedia — uploaded and curated on its own,
    not reused from department imagery."""

    title = models.CharField(max_length=120)
    video = models.FileField(upload_to="showcase_videos/")
    thumbnail = models.ImageField(upload_to="showcase_videos/thumbnails/", blank=True, null=True)
    cta_label = models.CharField(max_length=40, blank=True, default="Shop now")
    link_url = models.CharField(max_length=255, blank=True, help_text="Optional custom link. Falls back to the linked product or department.")
    product = models.ForeignKey("catalog.Product", on_delete=models.SET_NULL, null=True, blank=True, related_name="showcase_videos")
    department = models.ForeignKey("catalog.Department", on_delete=models.SET_NULL, null=True, blank=True, related_name="showcase_videos")
    order = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "-created_at"]

    def __str__(self):
        return self.title
