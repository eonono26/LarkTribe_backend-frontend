from django.core.management.base import BaseCommand
from django.db.models import Q

from catalog.models import AgeGroup, Product


# ============================================================================
# AGE GROUPS
# ============================================================================
# AgeGroup is ONLY about age + stage.
#
# Gender belongs to:
#     Product.gender
#
# Size belongs to:
#     ProductVariant.size (browsed via the Size filter — see SIZE_OPTIONS
#     in components/FilterSidebar.tsx on the frontend)
#
# Taxonomy (exact structure requested by the storefront brief):
#
#     BABY
#       └── 0-24 Months          (single group, not split by month)
#
#     KIDS
#       ├── 2-3 Yrs
#       ├── 4-5 Yrs
#       └── 6-8 Yrs
#
#     TEENS
#       └── Teens                (13+, no age subdivision)
#
#     REST OF THE RANGE (9-20 yrs, i.e. older kids / gen-z) is
#     deliberately NOT modelled as AgeGroup rows. Past age ~8 the
#     Rookie-USA-style pattern is to size-shop rather than age-shop, so
#     those shoppers use the Size filter (2T-4T, XS-XL) instead of a
#     "9-12 Yrs" / "13-16 Yrs" age tile. This keeps AgeGroupNav to a
#     short, tappable row (0-24 Months, 2-3, 4-5, 6-8, Teens) instead of
#     a long list nobody scrolls through.
#
# Do NOT create:
#     Boys 0-24 Months
#     Girls 2-3 Yrs
#     (gender is Product.gender, never duplicated onto AgeGroup)
# ============================================================================

AGE_GROUPS = [
    # name, min_age_years, max_age_years, icon, order, stage
    ("0-24 Months", 0, 2, "🍼", 0, AgeGroup.Stage.BABY),

    ("2-3 Yrs", 2, 3, "🎨", 0, AgeGroup.Stage.KIDS),
    ("4-5 Yrs", 4, 5, "🧒", 1, AgeGroup.Stage.KIDS),
    ("6-8 Yrs", 6, 8, "👦", 2, AgeGroup.Stage.KIDS),

    ("Teens", 13, None, "🎒", 0, AgeGroup.Stage.TEENS),
]


# ============================================================================
# OLD AGE GROUP → NEW AGE GROUP(S)
# ============================================================================
# Used to preserve existing product relationships where possible.
# A product can map to more than one new group when the old group was
# broader than any single new group (e.g. "0-24 Months" spanned what is
# now four separate baby age groups).
# ============================================================================

AGE_GROUP_MIGRATION = {
    # Generic / legacy names from earlier seed runs
    "Baby": ["0-24 Months"],
    "Toddler": ["2-3 Yrs"],
    "Preschool": ["2-3 Yrs"],
    "Kids": ["4-5 Yrs"],
    "Teen (15-20 Yrs)": ["Teens"],
    "Adult": ["Teens"],

    # Previous (month-split) seed run — collapse the four baby groups
    # and three year-band groups back into the requested taxonomy.
    "0-3 Months": ["0-24 Months"],
    "3-6 Months": ["0-24 Months"],
    "6-12 Months": ["0-24 Months"],
    "12-24 Months": ["0-24 Months"],
    "2-4 Years": ["2-3 Yrs", "4-5 Yrs"],
    "5-7 Years": ["6-8 Yrs"],
    "8-12 Years": ["6-8 Yrs"],

    # Even older size-labelled names
    "3-4 Yrs": ["2-3 Yrs", "4-5 Yrs"],
    "5-6 Yrs": ["4-5 Yrs", "6-8 Yrs"],
    "Older Kids": ["6-8 Yrs"],
    "Young Teen": ["Teens"],
    "Teen": ["Teens"],
    "XS (7-8 Yrs)": ["6-8 Yrs"],
    "S (8-10 Yrs)": ["6-8 Yrs"],
    "M (10-12 Yrs)": ["Teens"],
    "L (12-13 Yrs)": ["Teens"],
    "XL (13-15 Yrs)": ["Teens"],
}


# ============================================================================
# OLD GENERIC / RETIRED GROUPS
# ============================================================================
# These are removed after products have been migrated where possible.
# ============================================================================

RETIRED_GROUP_NAMES = [
    "Baby",
    "Toddler",
    "Preschool",
    "Kids",
    "3-4 Yrs",
    "5-6 Yrs",
    "XS (7-8 Yrs)",
    "S (8-10 Yrs)",
    "M (10-12 Yrs)",
    "L (12-13 Yrs)",
    "XL (13-15 Yrs)",
    "Teen (15-20 Yrs)",
    "Adult",
    # Previous run's month-split / year-band taxonomy, now collapsed
    "0-3 Months",
    "3-6 Months",
    "6-12 Months",
    "12-24 Months",
    "2-4 Years",
    "5-7 Years",
    "8-12 Years",
    "Older Kids",
    "Young Teen",
]


# ============================================================================
# EXPLICIT AGE KEYWORDS
# ============================================================================
# IMPORTANT:
# These are intentionally specific.
#
# "boys" alone does NOT determine age.
# "girls" alone does NOT determine age.
#
# We only tag a product when there is evidence for an age range.
# ============================================================================

AGE_KEYWORDS = {
    "0-24 Months": [
        "0-3 months", "0-3m", "newborn", "new born",
        "3-6 months", "3-6m",
        "6-9 months", "6-9m", "6-12 months", "6-12m",
        "9-12 months", "9-12m",
        "12-18 months", "12-18m", "18-24 months", "18-24m",
        "12-24 months", "12-24m",
        "0-24 months",
    ],

    "2-3 Yrs": [
        "toddler",
        "2t", "3t",
        "2-3 years", "2-3 yrs",
    ],

    "4-5 Yrs": [
        "4t",
        "3-4 years", "3-4 yrs",
        "4-5 years", "4-5 yrs",
        "preschool", "pre-school",
    ],

    "6-8 Yrs": [
        "5-6 years", "5-6 yrs",
        "6-7 years", "6-7 yrs",
        "5-7 years", "5-7 yrs",
        "6-8 years", "6-8 yrs",
        "7-8 years", "7-8 yrs",
        "8-10 years", "8-10 yrs",
    ],

    "Teens": [
        "teen",
        "teenager",
        "teenagers",
        "youth",
        "junior",
        "10-12 years", "10-12 yrs",
        "13-15 years", "13-15 yrs",
        "15-17 years", "15-17 yrs",
        "13-17 years", "13-17 yrs",
    ],
}


# ============================================================================
# CATEGORY → AGE GROUP FALLBACK
# ============================================================================
# Used only when the category clearly indicates an age segment.
#
# This is safer than assigning based on "boys"/"girls".
# ============================================================================

CATEGORY_AGE_KEYWORDS = {
    "0-24 Months": [
        "newborn",
        "baby",
        "infant",
    ],
    "2-3 Yrs": [
        "toddler",
    ],
    "4-5 Yrs": [
        "preschool",
        "pre-school",
    ],
    "6-8 Yrs": [
        "kids",
        "children",
        "childrens",
        "children's",
    ],
    "Teens": [
        "teen",
        "teenagers",
        "youth",
        "junior",
    ],
}


class Command(BaseCommand):
    help = """
    Seed the catalog age groups.

    Exact taxonomy:
        Baby:  0-24 Months
        Kids:  2-3 Yrs, 4-5 Yrs, 6-8 Yrs
        Teens: Teens (no age subdivision)

    Everything past ~8 years (older kids / gen-z, roughly 9-20) is
    deliberately left off AgeGroup — those shoppers browse by Size
    instead (2T-4T, XS-XL via the Size filter), matching how Rookie
    USA / Edgars split "shop by age" vs "shop by size".

    AgeGroup carries age + stage. Product.gender handles Boys/Girls/Unisex.
    ProductVariant.size handles clothing sizes.

    The command:
    1. Creates/updates the new age groups (with the correct stage).
    2. Migrates products from old age groups.
    3. Uses explicit age keywords to tag products.
    4. Uses category names as a conservative fallback.
    5. Removes obsolete age groups.
    6. Prints a detailed summary.
    """

    def handle(self, *args, **options):

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                "🚀 Starting age group seed..."
            )
        )

        # ====================================================================
        # 1. CREATE / UPDATE AGE GROUPS
        # ====================================================================

        self.stdout.write("")
        self.stdout.write(
            self.style.WARNING(
                "📦 Creating/updating age groups..."
            )
        )

        groups = {}

        for name, min_age, max_age, icon, order, stage in AGE_GROUPS:

            obj, created = AgeGroup.objects.update_or_create(
                name=name,
                defaults={
                    "min_age_years": min_age,
                    "max_age_years": max_age,
                    "icon": icon,
                    "order": order,
                    "stage": stage,
                    "is_active": True,
                },
            )

            groups[name] = obj

            if created:
                self.stdout.write(
                    f"  ✅ Created: {name} "
                    f"({stage})"
                )
            else:
                self.stdout.write(
                    f"  🔄 Updated: {name} "
                    f"({stage})"
                )

        # ====================================================================
        # 2. MIGRATE PRODUCTS FROM OLD AGE GROUPS
        # ====================================================================

        self.stdout.write("")
        self.stdout.write(
            self.style.WARNING(
                "🔄 Migrating products from old age groups..."
            )
        )

        migrated_relationships = 0

        new_names_set = {g[0] for g in AGE_GROUPS}

        for old_name, new_names in AGE_GROUP_MIGRATION.items():

            old_group = AgeGroup.objects.filter(
                name=old_name
            ).exclude(
                name__in=new_names_set
            ).first()

            if not old_group:
                continue

            products = list(old_group.products.all())

            relationship_count = 0

            for new_name in new_names:

                new_group = groups.get(new_name)

                if not new_group:
                    continue

                for product in products:

                    # Avoid duplicate M2M relationships
                    if not product.age_groups.filter(
                        pk=new_group.pk
                    ).exists():

                        product.age_groups.add(new_group)
                        relationship_count += 1

            if relationship_count:
                migrated_relationships += relationship_count

                self.stdout.write(
                    f"  ↪ {old_name} → {', '.join(new_names)}: "
                    f"{relationship_count} relationships"
                )

        # ====================================================================
        # 3. TAG PRODUCTS USING EXPLICIT AGE KEYWORDS
        # ====================================================================

        self.stdout.write("")
        self.stdout.write(
            self.style.WARNING(
                "🔍 Detecting age groups from product information..."
            )
        )

        tagged_products = 0

        for group_name, keywords in AGE_KEYWORDS.items():

            group = groups.get(group_name)

            if not group:
                continue

            query = Q()

            for keyword in keywords:

                query |= Q(
                    name__icontains=keyword
                )

                query |= Q(
                    description__icontains=keyword
                )

            products = Product.objects.filter(
                query
            ).distinct()

            count = 0

            for product in products:

                # Don't blindly replace existing classifications.
                if not product.age_groups.filter(
                    pk=group.pk
                ).exists():

                    product.age_groups.add(group)
                    count += 1

            if count:

                tagged_products += count

                self.stdout.write(
                    f"  ✅ {group_name}: "
                    f"{count} products tagged"
                )

        # ====================================================================
        # 4. CATEGORY-BASED FALLBACK
        # ====================================================================

        self.stdout.write("")
        self.stdout.write(
            self.style.WARNING(
                "📂 Checking category-based age information..."
            )
        )

        category_tagged = 0

        for group_name, keywords in CATEGORY_AGE_KEYWORDS.items():

            group = groups.get(group_name)

            if not group:
                continue

            query = Q()

            for keyword in keywords:

                query |= Q(
                    category__name__icontains=keyword
                )

                query |= Q(
                    category__parent__name__icontains=keyword
                )

            products = Product.objects.filter(
                query
            ).distinct()

            count = 0

            for product in products:

                # Only use category as a fallback.
                # If product already has an age group, don't overwrite it.
                if product.age_groups.exists():
                    continue

                product.age_groups.add(group)
                count += 1

            if count:

                category_tagged += count

                self.stdout.write(
                    f"  📂 {group_name}: "
                    f"{count} products tagged from categories"
                )

        # ====================================================================
        # 5. REMOVE RETIRED AGE GROUPS
        # ====================================================================

        self.stdout.write("")
        self.stdout.write(
            self.style.WARNING(
                "🗑️ Removing retired age groups..."
            )
        )

        retired = AgeGroup.objects.filter(
            name__in=RETIRED_GROUP_NAMES
        ).exclude(
            name__in=new_names_set
        )

        retired_count = retired.count()

        if retired_count:

            retired_names = list(
                retired.values_list(
                    "name",
                    flat=True
                )
            )

            retired.delete()

            self.stdout.write(
                self.style.SUCCESS(
                    f"  🗑️ Removed {retired_count} old age groups:"
                )
            )

            for name in retired_names:
                self.stdout.write(
                    f"     - {name}"
                )

        else:

            self.stdout.write(
                "  ℹ️ No retired age groups found."
            )

        # ====================================================================
        # 6. FINAL SUMMARY
        # ====================================================================

        self.stdout.write("")
        self.stdout.write("=" * 70)

        self.stdout.write(
            self.style.SUCCESS(
                "✅ AGE GROUP SEED COMPLETE"
            )
        )

        self.stdout.write("=" * 70)

        self.stdout.write(
            f"📊 Total age groups: "
            f"{AgeGroup.objects.count()}"
        )

        self.stdout.write(
            f"🔄 Relationships migrated: "
            f"{migrated_relationships}"
        )

        self.stdout.write(
            f"🏷️ Products tagged by age keywords: "
            f"{tagged_products}"
        )

        self.stdout.write(
            f"📂 Products tagged by category fallback: "
            f"{category_tagged}"
        )

        # ====================================================================
        # 7. DISPLAY AGE GROUPS BY STAGE
        # ====================================================================

        self.stdout.write("")
        self.stdout.write(
            self.style.WARNING(
                "📋 CURRENT AGE GROUPS"
            )
        )

        self.stdout.write("")

        for stage_value, stage_label in AgeGroup.Stage.choices:

            self.stdout.write(f"  {stage_label.upper()}")

            for group in AgeGroup.objects.filter(
                is_active=True,
                stage=stage_value,
            ).order_by("order"):

                product_count = group.products.count()

                if group.max_age_years is not None:

                    age_range = (
                        f"{group.min_age_years:g}-"
                        f"{group.max_age_years:g} years"
                    )

                else:

                    age_range = (
                        f"{group.min_age_years:g}+ years"
                    )

                self.stdout.write(
                    f"    {group.icon} "
                    f"{group.name:<15} "
                    f"{age_range:<15} "
                    f"Products: {product_count}"
                )

            self.stdout.write("")

        # ====================================================================
        # 8. DISPLAY PRODUCT GENDER SUMMARY
        # ====================================================================

        self.stdout.write(
            self.style.WARNING(
                "👕 PRODUCT GENDER SUMMARY"
            )
        )

        for gender_value, gender_label in Product.Gender.choices:

            count = Product.objects.filter(
                gender=gender_value
            ).count()

            self.stdout.write(
                f"  {gender_label:<10}: {count}"
            )

        self.stdout.write("")
        self.stdout.write("=" * 70)

        self.stdout.write(
            self.style.SUCCESS(
                "🎉 Seed finished successfully."
            )
        )

        self.stdout.write("=" * 70)
