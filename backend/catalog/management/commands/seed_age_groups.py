from django.core.management.base import BaseCommand
from django.db.models import Q
from catalog.models import AgeGroup, Product

AGE_GROUPS = [
    # name, min_years, max_years, icon, order
    ("Baby", 0, 2, "🍼", 0),
    ("Toddler", 1, 4, "🧸", 1),
    ("Kids", 4, 12, "🧒", 2),
    ("Teens", 13, 19, "🎒", 3),
    ("Adult", 18, None, "🧑", 4),
]

# Keyword → age-group name, used to auto-tag existing demo products so the
# new age nav isn't empty on a fresh seed. Admins can retag anytime.
KEYWORDS = {
    "Baby": ["baby", "infant", "newborn"],
    "Toddler": ["toddler"],
    "Kids": ["kids", "kid ", "children", "child"],
    "Teens": ["teen", "youth", "junior"],
}


class Command(BaseCommand):
    help = "Seed age-group shopping segments (Baby, Toddler, Kids, Teens, Adult) and heuristically tag existing products."

    def handle(self, *args, **options):
        groups = {}
        for name, min_y, max_y, icon, order in AGE_GROUPS:
            obj, created = AgeGroup.objects.update_or_create(
                name=name,
                defaults={"min_age_years": min_y, "max_age_years": max_y, "icon": icon, "order": order},
            )
            groups[name] = obj
            self.stdout.write(f"{'Created' if created else 'Updated'} age group {name}")

        tagged = 0
        for group_name, words in KEYWORDS.items():
            q = Q()
            for w in words:
                q |= Q(name__icontains=w) | Q(category__name__icontains=w) | Q(category__department__name__icontains=w)
            matches = Product.objects.filter(q)
            for product in matches:
                product.age_groups.add(groups[group_name])
                tagged += 1

        self.stdout.write(self.style.SUCCESS(f"Age groups seeded. Heuristically tagged {tagged} product/age-group links."))
