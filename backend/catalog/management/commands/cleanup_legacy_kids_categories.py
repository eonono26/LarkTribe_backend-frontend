from django.core.management.base import BaseCommand
from catalog.models import Category

# The current Kids category tree (see seed_kids_categories.py) is exactly:
#   Baby / Boys / Girls / Gen Z  (top-level, parent=None)
#   + 20 subcategories under each.
#
# Earlier iterations of this project seeded a *different*, flat set of
# top-level Kids categories directly under the department (no gender tree):
#   "Baby (0-24 Months)", "Newborn Essentials", "School Wear", "Shoes",
#   "Toys", "Books", "Accessories", "Swimming Wear", "Bags", "Socks",
#   "Soiree", "Pants", "Tops", "Jacket", "Dresses", "Skirts", "Shorts"
#
# Those never got cleaned up, so they still sit in the DB as orphaned
# top-level Kids categories (parent=None) with 0 products. Because they
# were created before the real tree, they have lower primary keys, and
# because they all default to order=0, they sort ahead of (and crowd out)
# the real "Baby" / "Boys" / "Girls" / "Gen Z" top-level categories on any
# paginated fetch — which is why the storefront header's mega-menu was
# only ever finding "Baby" (and only its first child).
#
# This command removes exactly those legacy names, and only if they
# currently have zero products attached (safety check — if you've since
# attached real products to one of these names for some other reason,
# it's left alone and reported instead of deleted).

LEGACY_TOP_LEVEL_NAMES = [
    "Baby (0-24 Months)",
    "Newborn Essentials",
    "School Wear",
    "Shoes",
    "Toys",
    "Books",
    "Accessories",
    "Swimming Wear",
    "Bags",
    "Socks",
    "Soiree",
    "Pants",
    "Tops",
    "Jacket",
    "Dresses",
    "Skirts",
    "Shorts",
]


class Command(BaseCommand):
    help = "Remove stale, pre-mega-menu top-level Kids categories left over from an older seed (safe: only deletes ones with 0 products)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without actually deleting anything.",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)

        candidates = Category.objects.filter(
            department__name="Kids",
            parent__isnull=True,
            name__in=LEGACY_TOP_LEVEL_NAMES,
        )

        if not candidates.exists():
            self.stdout.write(self.style.SUCCESS("No legacy top-level Kids categories found. Nothing to do."))
            return

        deleted = 0
        skipped = 0

        for category in candidates:
            product_count = category.products.count()

            if product_count > 0:
                skipped += 1
                self.stdout.write(self.style.WARNING(
                    f"  Skipping '{category.name}' (id={category.id}) — has {product_count} product(s) attached."
                ))
                continue

            self.stdout.write(f"  {'Would delete' if dry_run else 'Deleting'} '{category.name}' (id={category.id})")
            if not dry_run:
                category.delete()
            deleted += 1

        self.stdout.write("")
        if dry_run:
            self.stdout.write(self.style.SUCCESS(f"Dry run complete. Would delete {deleted}, would skip {skipped}."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Deleted {deleted} legacy categories. Skipped {skipped} (had products)."))