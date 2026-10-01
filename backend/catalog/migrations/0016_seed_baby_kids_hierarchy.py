from django.db import migrations


# ============================================================================
# CATEGORY HIERARCHY SEED
# ============================================================================
# Implements the requested main-category structure:
#
#     Baby
#       ├── 0-3 Months
#       ├── 3-6 Months
#       ├── 6-12 Months
#       ├── 12-18 Months
#       └── 18-24 Months
#
#     Kids
#       ├── Boys
#       ├── Girls
#       └── Unisex
#
#     Women   (top-level, unchanged)
#     Men     (top-level, unchanged)
#
# This is purely additive:
#   - Baby becomes its own top-level Department (it previously only existed
#     as a nested Category under the Kids department, via
#     seed_kids_categories.py — that existing "Baby -> Baby Boys / Baby
#     Girls -> ..." tree and its products are left completely untouched, so
#     no existing product loses its category).
#   - Kids / Women / Men departments are reused if they already exist
#     (get_or_create by name), never duplicated.
#   - Boys / Girls are reused if they already exist (get_or_create by
#     department+parent+name, matching the model's own unique constraint),
#     so this is safe to run whether or not seed_kids_categories.py has
#     already been applied to this database. Only "Unisex" and the five
#     Baby age-group categories are new.
# ============================================================================

AGE_GROUP_CATEGORIES = [
    # name, slug, order
    ("0-3 Months", "0-3-months", 0),
    ("3-6 Months", "3-6-months", 1),
    ("6-12 Months", "6-12-months", 2),
    ("12-18 Months", "12-18-months", 3),
    ("18-24 Months", "18-24-months", 4),
]

KIDS_GENDER_CATEGORIES = [
    # name, slug, order
    ("Boys", "boys", 1),
    ("Girls", "girls", 2),
    ("Unisex", "unisex", 3),
]


def seed_hierarchy(apps, schema_editor):
    Department = apps.get_model("catalog", "Department")
    Category = apps.get_model("catalog", "Category")

    # ------------------------------------------------------------------
    # MAIN CATEGORIES (Departments)
    # ------------------------------------------------------------------
    baby_dept, _ = Department.objects.get_or_create(
        name="Baby",
        defaults={"slug": "baby", "order": 0, "is_active": True},
    )

    kids_dept, _ = Department.objects.get_or_create(
        name="Kids",
        defaults={"slug": "kids", "order": 1, "is_active": True},
    )

    Department.objects.get_or_create(
        name="Women",
        defaults={"slug": "women", "order": 2, "is_active": True},
    )

    Department.objects.get_or_create(
        name="Men",
        defaults={"slug": "men", "order": 3, "is_active": True},
    )

    # ------------------------------------------------------------------
    # BABY -> AGE GROUP SUBCATEGORIES
    # ------------------------------------------------------------------
    for name, slug, order in AGE_GROUP_CATEGORIES:
        Category.objects.get_or_create(
            department=baby_dept,
            parent=None,
            name=name,
            defaults={
                "slug": slug,
                "order": order,
                "is_active": True,
            },
        )

    # ------------------------------------------------------------------
    # KIDS -> BOYS / GIRLS / UNISEX SUBCATEGORIES
    # ------------------------------------------------------------------
    for name, slug, order in KIDS_GENDER_CATEGORIES:
        Category.objects.get_or_create(
            department=kids_dept,
            parent=None,
            name=name,
            defaults={
                "slug": slug,
                "order": order,
                "is_active": True,
            },
        )


def noop_reverse(apps, schema_editor):
    # Deliberately not deleting anything on reverse: by the time this has
    # run, real products/admin edits may already reference these rows.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0015_product_features"),
    ]

    operations = [
        migrations.RunPython(seed_hierarchy, noop_reverse),
    ]
