import uuid
from datetime import timedelta
from django.conf import settings
from django.db import models
from django.utils import timezone


def _expiry():
    return timezone.now() + timedelta(days=settings.TRYON_RETENTION_DAYS)


class TryOnRequest(models.Model):
    """One virtual try-on render: customer photo + one or more garments -> preview image."""

    class Status(models.TextChoices):
        PENDING = "pending", "Queued"
        PROCESSING = "processing", "Processing"
        DONE = "done", "Ready"
        FAILED = "failed", "Failed"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tryon_requests")
    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="tryon_requests")
    extra_products = models.ManyToManyField(
        "catalog.Product", blank=True, related_name="tryon_outfit_requests",
        help_text="Additional garments for a full-outfit preview (mix & match).",
    )
    color = models.CharField(max_length=40, blank=True)

    source_photo = models.ImageField(upload_to="tryon/source/", null=True, blank=True)
    result_image = models.ImageField(upload_to="tryon/results/", null=True, blank=True)

    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)
    error = models.CharField(max_length=255, blank=True)
    provider = models.CharField(max_length=20, blank=True)

    consent_at = models.DateTimeField(help_text="When the customer agreed to photo processing for this render.")
    is_saved = models.BooleanField(default=False, help_text="Saved to the customer's looks; kept past the retention window.")
    share_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    is_shared = models.BooleanField(default=False, help_text="Anyone with the share link can view this preview.")

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=_expiry)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"TryOn #{self.pk} {self.product_id} [{self.status}]"
