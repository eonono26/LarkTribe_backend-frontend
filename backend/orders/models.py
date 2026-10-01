from django.conf import settings
from django.db import models
from catalog.models import Product
from vendors.models import Vendor


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING_PAYMENT = "pending_payment", "Pending Payment"
        PAID = "paid", "Paid"
        PROCESSING = "processing", "Processing"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"
        REFUNDED = "refunded", "Refunded"

    class PaymentMethod(models.TextChoices):
        CARD = "card", "Card"
        MPESA = "mpesa", "M-Pesa"
        COD = "cod", "Cash on Delivery"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders")
    guest_email = models.EmailField(null=True, blank=True)  # supports guest checkout
    order_number = models.CharField(max_length=32, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING_PAYMENT)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    member_discount_total = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="5% member discount applied because the order was placed while signed in, on top of any coupon."
    )
    total = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_name = models.CharField(max_length=150)
    shipping_phone = models.CharField(max_length=20)
    shipping_address = models.TextField()
    shipping_city = models.CharField(max_length=100)
    shipping_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, help_text="Dropoff coordinate captured from the delivery location picker at checkout.")
    shipping_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    coupon_code = models.CharField(max_length=32, blank=True)
    mpesa_receipt = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_number


class OrderItem(models.Model):
    class FulfillmentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT, related_name="order_items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    variant = models.ForeignKey(
        "catalog.ProductVariant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
    )
    # Snapshot of the chosen size/color at purchase time, e.g. "Black / M" —
    # kept even if the variant is later edited or deleted.
    variant_label = models.CharField(max_length=100, blank=True)
    product_name = models.CharField(max_length=200)  # snapshot at purchase time
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    fulfillment_status = models.CharField(max_length=20, choices=FulfillmentStatus.choices, default=FulfillmentStatus.PENDING)

    @property
    def subtotal(self):
        return self.unit_price * self.quantity


class Coupon(models.Model):
    code = models.CharField(max_length=32, unique=True)
    percent_off = models.PositiveIntegerField(null=True, blank=True)
    amount_off = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    active = models.BooleanField(default=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    is_public = models.BooleanField(default=True, help_text="Shown in the customer 'My Coupons' wallet for saving.")

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return self.code
