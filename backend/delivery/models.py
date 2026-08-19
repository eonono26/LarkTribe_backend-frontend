from django.conf import settings
from django.db import models
from django.utils import timezone
from orders.models import Order

# Default dispatch hub (Nairobi CBD) used as the pickup point until vendors
# have their own store coordinates. Kept as a constant so it's easy to swap
# for a real geocoded vendor address later.
DEFAULT_PICKUP_LABEL = "LarkTribe Hub, Nairobi"
DEFAULT_PICKUP_LAT = -1.286389
DEFAULT_PICKUP_LNG = 36.817223


class Driver(models.Model):
    class Vehicle(models.TextChoices):
        BICYCLE = "bicycle", "Bicycle"
        BIKE = "bike", "Motorbike"
        CAR = "car", "Car"
        VAN = "van", "Van"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="driver_profile")
    phone = models.CharField(max_length=20)
    vehicle_type = models.CharField(max_length=10, choices=Vehicle.choices, default=Vehicle.BIKE)
    vehicle_plate = models.CharField(max_length=20, blank=True)
    photo = models.ImageField(upload_to="drivers/", blank=True, null=True)
    is_active = models.BooleanField(default=True, help_text="Approved/allowed to work. Admin-controlled.")
    is_online = models.BooleanField(default=False, help_text="Driver has toggled themselves available for jobs.")
    current_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    current_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    last_location_at = models.DateTimeField(null=True, blank=True)
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=5)
    rating_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        name = self.user.get_full_name() or self.user.username
        return f"{name} ({self.get_vehicle_type_display()})"

    @property
    def display_name(self):
        return self.user.get_full_name() or self.user.username


class Delivery(models.Model):
    class Status(models.TextChoices):
        UNASSIGNED = "unassigned", "Unassigned"
        ASSIGNED = "assigned", "Assigned"
        PICKED_UP = "picked_up", "Picked Up"
        EN_ROUTE = "en_route", "En Route"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"
        FAILED = "failed", "Failed"

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="delivery")
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name="deliveries")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UNASSIGNED)

    pickup_label = models.CharField(max_length=150, default=DEFAULT_PICKUP_LABEL)
    pickup_lat = models.DecimalField(max_digits=9, decimal_places=6, default=DEFAULT_PICKUP_LAT)
    pickup_lng = models.DecimalField(max_digits=9, decimal_places=6, default=DEFAULT_PICKUP_LNG)

    dropoff_label = models.CharField(max_length=200, blank=True)
    dropoff_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    dropoff_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    assigned_at = models.DateTimeField(null=True, blank=True)
    picked_up_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "deliveries"

    def __str__(self):
        return f"Delivery for {self.order.order_number}"

    def log(self, status, note="", lat=None, lng=None):
        """Append a timeline entry — powers the Bolt-style trip history shown to
        the customer, and keeps status changes auditable for dispatch."""
        DeliveryEvent.objects.create(delivery=self, status=status, note=note, lat=lat, lng=lng)

    def transition(self, new_status, note=""):
        self.status = new_status
        now = timezone.now()
        if new_status == self.Status.ASSIGNED and not self.assigned_at:
            self.assigned_at = now
        elif new_status == self.Status.PICKED_UP and not self.picked_up_at:
            self.picked_up_at = now
        elif new_status == self.Status.DELIVERED and not self.delivered_at:
            self.delivered_at = now
        self.save(update_fields=["status", "assigned_at", "picked_up_at", "delivered_at", "updated_at"])
        lat = self.driver.current_lat if self.driver else None
        lng = self.driver.current_lng if self.driver else None
        self.log(new_status, note=note, lat=lat, lng=lng)


class DeliveryEvent(models.Model):
    """One row per status change / location checkpoint — the trip timeline."""

    delivery = models.ForeignKey(Delivery, on_delete=models.CASCADE, related_name="events")
    status = models.CharField(max_length=20, choices=Delivery.Status.choices)
    note = models.CharField(max_length=200, blank=True)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.delivery_id} → {self.status}"
