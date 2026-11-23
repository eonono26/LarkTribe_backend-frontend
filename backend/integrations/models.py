from django.db import models


class PickupPoint(models.Model):
    """Collection points / hubs. The nearest active one is offered to the shopper."""
    name = models.CharField(max_length=120)
    address = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=80)
    lat = models.DecimalField(max_digits=9, decimal_places=6)
    lng = models.DecimalField(max_digits=9, decimal_places=6)
    opening_hours = models.CharField(max_length=120, blank=True, default="Mon-Sat 9:00-18:00")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["city", "name"]

    def __str__(self):
        return f"{self.name} ({self.city})"


class LocationEvent(models.Model):
    """Consent-only analytics: which cities visitors come from. Coordinates are
    rounded to ~1km before storage and no user/IP is kept."""
    city = models.CharField(max_length=80, db_index=True)
    lat = models.DecimalField(max_digits=6, decimal_places=2)
    lng = models.DecimalField(max_digits=6, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
