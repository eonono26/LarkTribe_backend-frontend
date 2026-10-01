"""
Seed the catalog with demo departments, categories, brands, age groups and
products for the corrected Kids -> Baby -> Boys/Girls -> Age -> Category
shopping flow.

MODEL RULES THIS COMMAND FOLLOWS
---------------------------------------------------------------------------
- Category is for the PRODUCT TYPE only (e.g. Baby -> Dresses). It never
  encodes gender or age ("Baby Girls", "Baby Girls 6-12 Months" are wrong).
- AgeGroup is AGE ONLY, grouped by stage (baby / kids / teens). It never
  encodes gender ("Boys 6-8" is wrong).
- Gender lives on Product.gender (girls / boys / unisex) and age lives on
  Product.age_groups (M2M) — that's how "Baby Girls, 6-12 Months" is
  expressed: Category=Baby, gender=girls, age_groups=[6-12 Months].
---------------------------------------------------------------------------

Usage:
    python manage.py seed_products
    python manage.py seed_products --products 150
    python manage.py seed_products --flush          # wipe catalog data first
"""

import random
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from accounts.models import User
from vendors.models import Vendor
from catalog.models import (
    Department,
    Category,
    AgeGroup,
    Brand,
    Product,
    ProductImage,
    ProductVariant,
)

try:
    from PIL import Image, ImageDraw, ImageFont
    HAS_PIL = True
except ImportError:
    HAS_PIL = False


# ============================================================================
# DEPARTMENTS
# ============================================================================

DEPARTMENTS = [
    # name, slug, description, order
    ("Kids", "kids", "Everything for little ones, from newborn to teen.", 0),
    ("Women", "women", "Women's fashion and accessories.", 1),
    ("Beauty", "beauty", "Skincare, haircare and makeup.", 2),
    ("Maternity", "maternity", "For expecting and new mothers.", 3),
    ("Home & Lifestyle", "home-lifestyle", "Nursery, feeding and home essentials.", 4),
]

# ============================================================================
# CATEGORY TREE
# ============================================================================
# department name -> list of (parent_name_or_None, [leaf category names])
#
# Kids has three product-type groups (Baby / Kids Wear / Teens) that map to
# the three AgeGroup stages below — but note the group itself is still a
# CATEGORY (product type container), not a gender or age value.
# ============================================================================

CATEGORY_TREE = {
    "Kids": [
        ("Baby", ["Dresses", "Tops", "Rompers", "Trousers", "Shoes"]),
        ("Kids Wear", ["T-Shirts", "Trousers", "Dresses", "Jackets", "Shoes"]),
        ("Teens", ["T-Shirts", "Hoodies", "Jeans", "Sneakers"]),
    ],
    "Women": [
        (None, ["Dresses", "Tops", "Jeans", "Shoes", "Bags"]),
    ],
    "Beauty": [
        (None, ["Skincare", "Haircare", "Makeup"]),
    ],
    "Maternity": [
        (None, ["Maternity Wear", "Nursing Wear", "Accessories"]),
    ],
    "Home & Lifestyle": [
        (None, ["Nursery", "Feeding", "Toys"]),
    ],
}

# Maps a Kids parent-category name to the AgeGroup stage its products draw from.
KIDS_GROUP_TO_STAGE = {
    "Baby": "baby",
    "Kids Wear": "kids",
    "Teens": "teens",
}

# ============================================================================
# AGE GROUPS (age-only, grouped by stage)
# ============================================================================

AGE_GROUPS = [
    # name, stage, min_age_years, max_age_years, icon, order
    ("0-3 Months", "baby", 0, 0.25, "🍼", 0),
    ("3-6 Months", "baby", 0.25, 0.5, "🍼", 1),
    ("6-12 Months", "baby", 0.5, 1, "👶", 2),
    ("12-24 Months", "baby", 1, 2, "👶", 3),
    ("2-4 Years", "kids", 2, 4, "🧒", 0),
    ("5-7 Years", "kids", 5, 7, "🎒", 1),
    ("8-12 Years", "kids", 8, 12, "🎨", 2),
    ("13-15 Years", "teens", 13, 15, "🎓", 0),
    ("16-18 Years", "teens", 16, 18, "🧑", 1),
]

# ============================================================================
# BRANDS
# ============================================================================

BRANDS = [
    "Duka Kids", "Little Sprout", "Nairobi Threads", "Sunny Days", "Comfy Co",
    "Tiny Steps", "Bright Buds", "Urban Mama", "Pure Glow", "Home Haven",
]

GENDERS = ["girls", "boys", "unisex"]
ADJECTIVES = [
    "Classic", "Cozy", "Playful", "Breezy", "Bold", "Soft", "Everyday",
    "Weekend", "Sunshine", "Pastel", "Striped", "Floral", "Denim",
    "Organic Cotton", "Comfy", "Little", "Signature", "Essential",
]
COLORS = ["Pink", "Blue", "Yellow", "White", "Grey", "Mint", "Coral", "Navy", "Sage", "Cream"]

# department name -> (min_price, max_price) in KES
PRICE_RANGES = {
    "Kids": (500, 3500),
    "Women": (800, 5500),
    "Beauty": (300, 2800),
    "Maternity": (900, 4500),
    "Home & Lifestyle": (400, 3200),
}

PLACEHOLDER_COLORS = [
    (247, 202, 201), (186, 220, 209), (255, 224, 178), (197, 202, 233),
    (255, 245, 186), (208, 235, 255), (232, 213, 255), (255, 214, 224),
]


class Command(BaseCommand):
    help = "Seed departments, categories, brands, age groups and demo products."

    def add_arguments(self, parser):
        parser.add_argument(
            "--products", type=int, default=100,
            help="Total number of products to create (default: 100).",
        )
        parser.add_argument(
            "--flush", action="store_true",
            help="Delete existing catalog data (products, categories, "
                 "departments, brands, age groups) before seeding.",
        )

    def handle(self, *args, **options):
        product_count = options["products"]

        if options["flush"]:
            self.flush_catalog()

        with transaction.atomic():
            vendors = self.seed_vendors()
            departments = self.seed_departments()
            categories = self.seed_categories(departments)
            age_groups = self.seed_age_groups()
            brands = self.seed_brands()
            self.seed_products(product_count, vendors, categories, age_groups, brands)

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. Departments={Department.objects.count()} "
            f"Categories={Category.objects.count()} "
            f"AgeGroups={AgeGroup.objects.count()} "
            f"Brands={Brand.objects.count()} "
            f"Products={Product.objects.count()}"
        ))

    # ------------------------------------------------------------------
    # FLUSH
    # ------------------------------------------------------------------

    def flush_catalog(self):
        self.stdout.write("Flushing existing catalog data...")
        ProductImage.objects.all().delete()
        ProductVariant.objects.all().delete()
        Product.objects.all().delete()
        Category.objects.all().delete()
        Department.objects.all().delete()
        AgeGroup.objects.all().delete()
        Brand.objects.all().delete()

    # ------------------------------------------------------------------
    # VENDORS (products need an owning vendor)
    # ------------------------------------------------------------------

    def seed_vendors(self):
        self.stdout.write("Seeding demo vendors...")
        vendor_specs = [
            ("duka_demo_vendor1", "Duka Kids Store"),
            ("duka_demo_vendor2", "Little Wardrobe"),
            ("duka_demo_vendor3", "Nairobi Baby Co"),
        ]
        vendors = []
        for username, store_name in vendor_specs:
            user, _ = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{username}@example.com",
                    "role": User.Role.VENDOR,
                },
            )
            vendor, _ = Vendor.objects.get_or_create(
                user=user,
                defaults={
                    "store_name": store_name,
                    "slug": slugify(store_name),
                    "status": Vendor.Status.APPROVED,
                },
            )
            vendors.append(vendor)
        return vendors

    # ------------------------------------------------------------------
    # DEPARTMENTS
    # ------------------------------------------------------------------

    def seed_departments(self):
        self.stdout.write("Seeding departments...")
        departments = {}
        for name, slug, description, order in DEPARTMENTS:
            dept, _ = Department.objects.get_or_create(
                slug=slug,
                defaults={"name": name, "description": description, "order": order},
            )
            departments[name] = dept
        return departments

    # ------------------------------------------------------------------
    # CATEGORIES
    # ------------------------------------------------------------------

    def seed_categories(self, departments):
        """
        Returns {department_name: {"Baby": {"Dresses": Category, ...}, ...}}
        for grouped departments (Kids), or
        {department_name: {"__flat__": {"Dresses": Category, ...}}} for
        ungrouped departments.
        """
        self.stdout.write("Seeding categories...")
        result = {}

        for dept_name, groups in CATEGORY_TREE.items():
            department = departments[dept_name]
            result[dept_name] = {}
            order = 0

            for parent_name, leaf_names in groups:
                if parent_name:
                    parent, _ = Category.objects.get_or_create(
                        department=department,
                        parent=None,
                        name=parent_name,
                        defaults={"order": order},
                    )
                    order += 1
                    bucket_key = parent_name
                    parent_for_leaves = parent
                else:
                    bucket_key = "__flat__"
                    parent_for_leaves = None

                result[dept_name].setdefault(bucket_key, {})

                for leaf_name in leaf_names:
                    leaf, _ = Category.objects.get_or_create(
                        department=department,
                        parent=parent_for_leaves,
                        name=leaf_name,
                        defaults={"order": order},
                    )
                    order += 1
                    result[dept_name][bucket_key][leaf_name] = leaf

        return result

    # ------------------------------------------------------------------
    # AGE GROUPS
    # ------------------------------------------------------------------

    def seed_age_groups(self):
        self.stdout.write("Seeding age groups...")
        by_stage = {"baby": [], "kids": [], "teens": []}
        for name, stage, min_age, max_age, icon, order in AGE_GROUPS:
            ag, _ = AgeGroup.objects.get_or_create(
                name=name,
                defaults={
                    "stage": stage,
                    "min_age_years": min_age,
                    "max_age_years": max_age,
                    "icon": icon,
                    "order": order,
                },
            )
            # Keep stage/order in sync if the row already existed.
            changed = False
            if ag.stage != stage:
                ag.stage = stage
                changed = True
            if ag.min_age_years != min_age or ag.max_age_years != max_age:
                ag.min_age_years = min_age
                ag.max_age_years = max_age
                changed = True
            if changed:
                ag.save()
            by_stage[stage].append(ag)
        return by_stage

    # ------------------------------------------------------------------
    # BRANDS
    # ------------------------------------------------------------------

    def seed_brands(self):
        self.stdout.write("Seeding brands...")
        brands = []
        for name in BRANDS:
            brand, _ = Brand.objects.get_or_create(name=name)
            brands.append(brand)
        return brands

    # ------------------------------------------------------------------
    # PRODUCTS
    # ------------------------------------------------------------------

    def seed_products(self, total, vendors, categories, age_groups, brands):
        self.stdout.write(f"Seeding {total} products...")

        # Flatten every leaf category into a list of
        # (department_name, parent_bucket_key, category_name, Category obj)
        leaves = []
        for dept_name, buckets in categories.items():
            for bucket_key, leaf_map in buckets.items():
                for leaf_name, category in leaf_map.items():
                    leaves.append((dept_name, bucket_key, leaf_name, category))

        existing_skus = set(Product.objects.values_list("sku", flat=True))
        created = 0
        attempts = 0
        max_attempts = total * 20

        while created < total and attempts < max_attempts:
            attempts += 1
            dept_name, bucket_key, leaf_name, category = random.choice(leaves)

            price_lo, price_hi = PRICE_RANGES[dept_name]
            price = round(random.uniform(price_lo, price_hi), 2)
            on_sale = random.random() < 0.3
            compare_at_price = round(price * random.uniform(1.15, 1.6), 2) if on_sale else None

            adjective = random.choice(ADJECTIVES)
            color = random.choice(COLORS)
            product_name = f"{adjective} {color} {leaf_name}".strip()

            sku = f"{slugify(dept_name)[:3].upper()}-{slugify(leaf_name)[:3].upper()}-{created + attempts:05d}"
            if sku in existing_skus:
                continue
            existing_skus.add(sku)

            # Gender + age groups: only meaningful for Kids categories.
            stage = KIDS_GROUP_TO_STAGE.get(bucket_key)
            if stage:
                gender = random.choice(GENDERS)
                pool = age_groups.get(stage, [])
                chosen_age_groups = random.sample(pool, k=min(len(pool), random.choice([1, 1, 2])))
            else:
                gender = "unisex"
                chosen_age_groups = []

            vendor = random.choice(vendors)
            brand = random.choice(brands) if random.random() < 0.85 else None
            stock = random.choice([0, 0] + list(range(5, 120)))
            status = Product.Status.ACTIVE if random.random() < 0.92 else Product.Status.PENDING
            is_featured = random.random() < 0.1

            product = Product.objects.create(
                vendor=vendor,
                category=category,
                brand=brand,
                gender=gender,
                name=product_name,
                description=(
                    f"{product_name} — a {adjective.lower()} pick from {dept_name}. "
                    f"Comfortable, durable and easy to style."
                ),
                price=price,
                compare_at_price=compare_at_price,
                stock=stock,
                sku=sku,
                status=status,
                is_featured=is_featured,
            )
            if chosen_age_groups:
                product.age_groups.set(chosen_age_groups)

            # A couple of size/colour variants for realism.
            sizes = self.sizes_for(dept_name, bucket_key)
            if sizes:
                for size in random.sample(sizes, k=min(len(sizes), random.choice([2, 3]))):
                    ProductVariant.objects.create(
                        product=product,
                        size=size,
                        color=color,
                        stock=random.randint(0, 30),
                    )

            self.attach_placeholder_image(product, product_name)

            created += 1
            if created % 10 == 0:
                self.stdout.write(f"  ...{created}/{total}")

        if created < total:
            self.stdout.write(self.style.WARNING(
                f"Only created {created}/{total} products (ran out of unique SKU attempts)."
            ))

    def sizes_for(self, dept_name, bucket_key):
        if bucket_key == "Baby":
            return ["0-3M", "3-6M", "6-12M", "12-24M"]
        if bucket_key == "Kids Wear":
            return ["2T", "3T", "4T", "5-6Y", "7-8Y"]
        if bucket_key == "Teens":
            return ["XS", "S", "M", "L", "XL"]
        if dept_name == "Women":
            return ["XS", "S", "M", "L", "XL"]
        return []

    # ------------------------------------------------------------------
    # PLACEHOLDER IMAGES
    # ------------------------------------------------------------------

    def attach_placeholder_image(self, product, label):
        if not HAS_PIL:
            return

        bg = random.choice(PLACEHOLDER_COLORS)
        img = Image.new("RGB", (600, 600), color=bg)
        draw = ImageDraw.Draw(img)

        initials = "".join(w[0] for w in label.split()[:2]).upper()
        try:
            font = ImageFont.truetype("DejaVuSans-Bold.ttf", 160)
        except Exception:
            font = ImageFont.load_default()

        bbox = draw.textbbox((0, 0), initials, font=font)
        text_w, text_h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(
            ((600 - text_w) / 2, (600 - text_h) / 2 - bbox[1]),
            initials,
            fill=(60, 60, 60),
            font=font,
        )

        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=85)
        buffer.seek(0)

        image_field = ContentFile(buffer.read(), name=f"{product.sku}.jpg")
        ProductImage.objects.create(
            product=product,
            image=image_field,
            alt_text=label,
            order=0,
        )