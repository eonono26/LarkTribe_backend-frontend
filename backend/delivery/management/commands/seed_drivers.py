import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from delivery.models import Driver, DEFAULT_PICKUP_LAT, DEFAULT_PICKUP_LNG

User = get_user_model()

DRIVERS = [
    ("driver_amina", "Amina", "Wanjiru", "bike", "KMEA 213B"),
    ("driver_brian", "Brian", "Otieno", "car", "KDG 445K"),
    ("driver_cynthia", "Cynthia", "Mwangi", "van", "KCX 908T"),
    ("driver_felix", "Felix", "Kiptoo", "bicycle", "N/A"),
]


class Command(BaseCommand):
    help = "Seed demo driver accounts (username/password: driver_x / driver1234) scattered around Nairobi, for testing dispatch and tracking."

    def handle(self, *args, **options):
        for username, first, last, vehicle, plate in DRIVERS:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "first_name": first, "last_name": last,
                    "email": f"{username}@example.com",
                    "role": User.Role.DRIVER,
                },
            )
            if created:
                user.set_password("driver1234")
                user.save()
            elif user.role != User.Role.DRIVER:
                user.role = User.Role.DRIVER
                user.save(update_fields=["role"])

            # Scatter starting positions a few km around the default hub so the
            # admin dispatch map has something to show immediately.
            jitter_lat = DEFAULT_PICKUP_LAT + random.uniform(-0.03, 0.03)
            jitter_lng = DEFAULT_PICKUP_LNG + random.uniform(-0.03, 0.03)

            driver, driver_created = Driver.objects.update_or_create(
                user=user,
                defaults={
                    "phone": f"07{random.randint(10000000, 99999999)}",
                    "vehicle_type": vehicle,
                    "vehicle_plate": plate,
                    "is_active": True,
                    "is_online": True,
                    "current_lat": jitter_lat,
                    "current_lng": jitter_lng,
                },
            )
            self.stdout.write(f"{'Created' if created else 'Updated'} driver {username} ({vehicle})")

        self.stdout.write(self.style.SUCCESS(
            "Demo drivers seeded. Log in as e.g. driver_amina / driver1234 to test the driver screen."
        ))
