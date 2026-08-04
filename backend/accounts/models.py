import random
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta


class User(AbstractUser):
    class Role(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        VENDOR = "vendor", "Vendor"
        ADMIN = "admin", "Admin"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    phone = models.CharField(max_length=20, blank=True)
    is_phone_verified = models.BooleanField(default=False)
    google_sub = models.CharField(max_length=255, blank=True, null=True, unique=True, help_text="Google account subject id, once linked.")
    apple_sub = models.CharField(max_length=255, blank=True, null=True, unique=True, help_text="Apple account subject id, once linked.")
    created_at = models.DateTimeField(auto_now_add=True)

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
