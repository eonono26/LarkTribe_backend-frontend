import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create or update the deployment administrator from environment variables."

    def handle(self, *args, **options):
        username = os.environ.get("DJANGO_ADMIN_USERNAME", "demo_admin").strip()
        email = os.environ.get("DJANGO_ADMIN_EMAIL", "").strip()
        password = os.environ.get("DJANGO_ADMIN_PASSWORD", "")

        if not username or not email or not password:
            raise CommandError(
                "Set DJANGO_ADMIN_USERNAME, DJANGO_ADMIN_EMAIL, and "
                "DJANGO_ADMIN_PASSWORD in the service environment."
            )

        if len(password) < 14:
            raise CommandError("DJANGO_ADMIN_PASSWORD must be at least 14 characters.")

        User = get_user_model()
        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": email},
        )

        user.email = email
        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        if hasattr(user, "role"):
            user.role = "admin"
        user.set_password(password)
        user.save()

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} deployment administrator: {username}"))
