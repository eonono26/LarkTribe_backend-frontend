import random
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta


class User(AbstractUser):
    class Role(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        VENDOR = "vendor", "Vendor"
        DRIVER = "driver", "Driver"
        ADMIN = "admin", "Admin"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    phone = models.CharField(max_length=20, blank=True)
    is_phone_verified = models.BooleanField(default=False)
    google_sub = models.CharField(max_length=255, blank=True, null=True, unique=True, help_text="Google account subject id, once linked.")
    apple_sub = models.CharField(max_length=255, blank=True, null=True, unique=True, help_text="Apple account subject id, once linked.")
    preferred_currency = models.CharField(max_length=3, default="KES", help_text="Storefront currency code, e.g. KES, USD.")
    preferred_language = models.CharField(max_length=5, default="en", help_text="Storefront language code, e.g. en, sw.")
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Profile picture
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        blank=True,
        null=True,
        help_text="User's profile picture/avatar"
    )

    def __str__(self):
        return f"{self.username} ({self.role})"


class PhoneOTP(models.Model):
    """One-time codes for phone registration/login."""
    phone = models.CharField(max_length=20, db_index=True)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    consumed = models.BooleanField(default=False)

    @classmethod
    def issue(cls, phone):
        code = f"{random.randint(0, 999999):06d}"
        return cls.objects.create(phone=phone, code=code)

    def is_valid(self):
        return not self.consumed and (timezone.now() - self.created_at) < timedelta(minutes=10)


class Address(models.Model):
    """A customer's saved delivery address — the noon.com-style address book,
    selectable at checkout instead of retyping shipping details each time."""

    class Label(models.TextChoices):
        HOME = "home", "Home"
        WORK = "work", "Work"
        OTHER = "other", "Other"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="addresses")
    label = models.CharField(max_length=10, choices=Label.choices, default=Label.HOME)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    address_line = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_default", "-created_at"]
        verbose_name_plural = "addresses"

    def __str__(self):
        return f"{self.label} — {self.full_name}, {self.city}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_default:
            Address.objects.filter(user=self.user).exclude(pk=self.pk).update(is_default=False)


class PaymentMethod(models.Model):
    """A customer's saved payment method. Cards are stored as display-only tokens
    (brand + last 4 digits) — no PAN/CVV ever touches this backend; a real deployment
    would swap in tokens from a PCI-compliant processor (Stripe, Flutterwave, etc.)."""

    class Type(models.TextChoices):
        CARD = "card", "Card"
        MPESA = "mpesa", "M-Pesa"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payment_methods")
    type = models.CharField(max_length=10, choices=Type.choices)
    label = models.CharField(max_length=50, blank=True)
    card_brand = models.CharField(max_length=20, blank=True)
    card_last4 = models.CharField(max_length=4, blank=True)
    card_exp_month = models.PositiveSmallIntegerField(null=True, blank=True)
    card_exp_year = models.PositiveSmallIntegerField(null=True, blank=True)
    mpesa_phone = models.CharField(max_length=20, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_default", "-created_at"]

    def __str__(self):
        if self.type == self.Type.CARD:
            return f"{self.card_brand} •••• {self.card_last4}"
        return f"M-Pesa {self.mpesa_phone}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_default:
            PaymentMethod.objects.filter(user=self.user).exclude(pk=self.pk).update(is_default=False)