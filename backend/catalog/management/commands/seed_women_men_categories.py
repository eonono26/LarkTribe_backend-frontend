from django.core.management.base import BaseCommand
from django.utils.text import slugify
from catalog.models import Department, Category

# Starter category tree for the two new top-level departments (Women / Men),
# added alongside the existing Baby / Kids stages. Mirrors the shape used by
# seed_kids_categories.py: flat top-level groups, each with leaf subcategories.
DEPARTMENT_CATEGORIES = {
    "Women": {
        "Clothing": [
            "Dresses", "Tops", "T-Shirts", "Jeans", "Trousers", "Skirts",
            "Jumpsuits & Co-ords", "Jackets & Coats", "Sweaters & Hoodies",
            "Activewear", "Loungewear", "Swimwear",
        ],
        "Shoes": [
            "Flats", "Heels", "Sneakers", "Sandals", "Boots",
        ],
        "Bags & Accessories": [
            "Handbags", "Wallets", "Jewelry", "Scarves", "Sunglasses", "Belts",
        ],
        "Beauty": [
            "Skincare", "Makeup", "Fragrance", "Hair Care",
        ],
    },
    "Men": {
        "Clothing": [
            "T-Shirts", "Shirts", "Jeans", "Trousers", "Shorts",
            "Jackets & Coats", "Sweaters & Hoodies", "Activewear", "Suits",
        ],
        "Shoes": [
            "Sneakers", "Formal Shoes", "Sandals", "Boots",
        ],
        "Bags & Accessories": [
            "Bags", "Wallets", "Watches", "Belts", "Sunglasses", "Caps & Hats",
        ],
        "Grooming": [
            "Skincare", "Fragrance", "Hair Care", "Shaving",
        ],
    },
}


class Command(BaseCommand):
    help = (
        "Seed the Women and Men top-level Departments, each with a starter "
        "category tree (Clothing / Shoes / Bags & Accessories / Beauty-or-"
        "Grooming), so the main nav has real department + category data to "
        "render alongside the existing Baby / Kids stages."
    )

    def handle(self, *args, **options):
        for dept_order, (dept_name, groups) in enumerate(DEPARTMENT_CATEGORIES.items(), start=10):
            dept_slug = slugify(dept_name)
            department, dept_created = Department.objects.update_or_create(
                slug=dept_slug,
                defaults={
                    "name": dept_name,
                    "order": dept_order,
                    "is_active": True,
                },
            )
            self.stdout.write(
                f"{'Created' if dept_created else 'Updated'} department {dept_name}"
            )

            for group_order, (group_name, leaf_names) in enumerate(groups.items()):
                group_slug = slugify(f"{group_name}-{dept_slug}")
                group, group_created = Category.objects.update_or_create(
                    slug=group_slug,
                    defaults={
                        "department": department,
                        "parent": None,
                        "name": group_name,
                        "order": group_order,
                        "is_active": True,
                    },
                )
                self.stdout.write(
                    f"  {'Created' if group_created else 'Updated'} {dept_name} / {group_name}"
                )

                for leaf_order, leaf_name in enumerate(leaf_names):
                    leaf_slug = slugify(f"{leaf_name}-{group_name}-{dept_slug}")
                    _, leaf_created = Category.objects.update_or_create(
                        slug=leaf_slug,
                        defaults={
                            "department": department,
                            "parent": group,
                            "name": leaf_name,
                            "order": leaf_order,
                            "is_active": True,
                        },
                    )
                    self.stdout.write(
                        f"    {'Created' if leaf_created else 'Updated'} {group_name} / {leaf_name}"
                    )

        self.stdout.write(self.style.SUCCESS("Women and Men departments seeded."))
