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

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    placement = models.CharField(max_length=20, choices=Placement.choices, default=Placement.HOMEPAGE_BANNER)
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
