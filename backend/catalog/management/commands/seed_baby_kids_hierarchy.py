from django.core.management.base import BaseCommand
from django.db import transaction

from catalog.models import Department, Category

# ============================================================================
# Re-runnable version of migration 0016_seed_baby_kids_hierarchy.
#
# The migration seeds this automatically on `migrate`. This command exists
# so the same idempotent seed can be re-run on demand (e.g. after a category
# was accidentally deleted in the admin) without faking/re-running migration
# state. Safe to run any number of times — get_or_create, never duplicates.
# ============================================================================

AGE_GROUP_CATEGORIES = [
    ("0-3 Months", "0-3-months", 0),
    ("3-6 Months", "3-6-months", 1),
    ("6-12 Months", "6-12-months", 2),
    ("12-18 Months", "12-18-months", 3),
    ("18-24 Months", "18-24-months", 4),
]

KIDS_GENDER_CATEGORIES = [
    ("Boys", "boys", 1),
    ("Girls", "girls", 2),
    ("Unisex", "unisex", 3),
]

class Command(BaseCommand):
    help = (
        "Seed the Baby (age-group subcategories) / Kids (Boys, Girls, "
        "Unisex) / Women / Men main-category hierarchy. Idempotent — "
        "safe to run repeatedly, never creates duplicates."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        baby_dept, baby_created = Department.objects.get_or_create(
            name="Baby",
            defaults={"slug": "baby", "order": 0, "is_active": True},
        )
        self.stdout.write(
            f"{'Created' if baby_created else 'Found existing'} department: Baby"
        )

        kids_dept, kids_created = Department.objects.get_or_create(
            name="Kids",
            defaults={"slug": "kids", "order": 1, "is_active": True},
        )
        self.stdout.write(
            f"{'Created' if kids_created else 'Found existing'} department: Kids"
        )

        women_dept, women_created = Department.objects.get_or_create(
            name="Women",
            defaults={"slug": "women", "order": 2, "is_active": True},
        )
        self.stdout.write(
            f"{'Created' if women_created else 'Found existing'} department: Women"
        )

        men_dept, men_created = Department.objects.get_or_create(
            name="Men",
            defaults={"slug": "men", "order": 3, "is_active": True},
        )
        self.stdout.write(
            f"{'Created' if men_created else 'Found existing'} department: Men"
        )

        # Baby age groups and Kids gender are FILTERS (AgeGroup / Product.gender),
        # not categories. The category tree comes from
        # `restructure_kids_baby_categories`.
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            "Baby / Kids / Women / Men hierarchy is in place."
        ))
