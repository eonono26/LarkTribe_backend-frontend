"""
Seed a complete, fresh demo catalog for the CURRENT main-category structure:

    Baby  -> 0-3 Months / 3-6 Months / 6-12 Months / 12-18 Months / 18-24 Months
    Kids  -> Boys / Girls / Unisex
    Women -> Clothing / Shoes / Bags & Accessories / Beauty   (existing tree)
    Men   -> Clothing / Shoes / Bags & Accessories / Grooming (existing tree)

This supersedes seed_products.py / seed_demo.py, which still target the
older Kids -> Baby/Kids Wear/Teens layout. Use this one going forward.

Idempotent by default: departments, categories, age groups and brands are
all get_or_create, so running it twice never duplicates them. Products are
only ever ADDED (there's no sane "already exists" check for a demo
product), so re-running without --flush keeps piling on more products —
use --flush for an actual clean slate.

Usage:
    python manage.py seed_fresh_catalog
    python manage.py seed_fresh_catalog --products 10
    python manage.py seed_fresh_catalog --flush --products 10
"""

import random
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import ProtectedError
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
# DEPARTMENTS (main categories)
# ============================================================================

DEPARTMENTS = [
    # name, slug, order
    ("Baby", "baby", 0),
    ("Kids", "kids", 1),
    ("Women", "women", 2),
    ("Men", "men", 3),
]

# ============================================================================
# BABY -> AGE-GROUP CATEGORIES (flat, leaf-level — products attach directly)
# ============================================================================

BABY_CATEGORIES = [
    # name, slug, order
    ("0-3 Months", "0-3-months", 0),
    ("3-6 Months", "3-6-months", 1),
    ("6-12 Months", "6-12-months", 2),
    ("12-18 Months", "12-18-months", 3),
    ("18-24 Months", "18-24-months", 4),
]

# ============================================================================
# KIDS -> GENDER CATEGORIES (flat, leaf-level — products attach directly)
# ============================================================================

KIDS_CATEGORIES = [
    # name, slug, order, matching Product.gender value
    ("Boys", "boys", 1, "boys"),
    ("Girls", "girls", 2, "girls"),
    ("Unisex", "unisex", 3, "unisex"),
]

# ============================================================================
# WOMEN / MEN -> product-type tree (group -> leaf names)
# ============================================================================

WOMEN_MEN_TREE = {
    "Women": {
        "Clothing": [
            "Dresses", "Tops", "T-Shirts", "Jeans", "Trousers", "Skirts",
            "Jumpsuits & Co-ords", "Jackets & Coats", "Sweaters & Hoodies",
            "Activewear", "Loungewear", "Swimwear",
        ],
        "Shoes": ["Flats", "Heels", "Sneakers", "Sandals", "Boots"],
        "Bags & Accessories": [
            "Handbags", "Wallets", "Jewelry", "Scarves", "Sunglasses", "Belts",
        ],
        "Beauty": ["Skincare", "Makeup", "Fragrance", "Hair Care"],
    },
    "Men": {
        "Clothing": [
            "T-Shirts", "Shirts", "Jeans", "Trousers", "Shorts",
            "Jackets & Coats", "Sweaters & Hoodies", "Activewear", "Suits",
        ],
        "Shoes": ["Sneakers", "Formal Shoes", "Sandals", "Boots"],
        "Bags & Accessories": [
            "Bags", "Wallets", "Watches", "Belts", "Sunglasses", "Caps & Hats",
        ],
        "Grooming": ["Skincare", "Fragrance", "Hair Care", "Shaving"],
    },
}

# ============================================================================
# AGE GROUPS (age-only — matches the live seed_age_groups.py taxonomy)
# ============================================================================

AGE_GROUPS = [
    # name, stage, min_age_years, max_age_years, icon, order
    ("0-24 Months", "baby", 0, 2, "🍼", 0),
    ("2-3 Yrs", "kids", 2, 3, "🎨", 0),
    ("4-5 Yrs", "kids", 4, 5, "🧒", 1),
    ("6-8 Yrs", "kids", 6, 8, "👦", 2),
    ("Teens", "teens", 13, None, "🎒", 0),
]

# ============================================================================
# BRANDS / NAMING / PRICING
# ============================================================================

BRANDS = [
    "Duka Kids", "Little Sprout", "Nairobi Threads", "Sunny Days", "Comfy Co",
    "Tiny Steps", "Bright Buds", "Urban Mama", "Pure Glow", "Home Haven",
]

ADJECTIVES = [
    "Classic", "Cozy", "Playful", "Breezy", "Bold", "Soft", "Everyday",
    "Weekend", "Sunshine", "Pastel", "Striped", "Floral", "Denim",
    "Organic Cotton", "Comfy", "Little", "Signature", "Essential",
]
COLORS = ["Pink", "Blue", "Yellow", "White", "Grey", "Mint", "Coral", "Navy", "Sage", "Cream"]

# department name -> (min_price, max_price) in KES
PRICE_RANGES = {
    "Baby": (500, 3000),
    "Kids": (600, 3500),
    "Women": (800, 5500),
    "Men": (800, 5500),
}

PLACEHOLDER_COLORS = [
    (247, 202, 201), (186, 220, 209), (255, 224, 178), (197, 202, 233),
    (255, 245, 186), (208, 235, 255), (232, 213, 255), (255, 214, 224),
]


class Command(BaseCommand):
    help = "Seed a fresh demo catalog for the Baby / Kids / Women / Men hierarchy."

    def add_arguments(self, parser):
        parser.add_argument(
            "--products", type=int, default=8,
            help="Number of demo products to create PER LEAF CATEGORY (default: 8).",
        )
        parser.add_argument(
            "--flush", action="store_true",
            help="Delete existing products, categories, departments, age groups "
                 "and brands first. Aborts safely (no changes made) if any "
                 "existing product is still referenced by a real order.",
        )

    def handle(self, *args, **options):
        per_leaf = options["products"]

        try:
            with transaction.atomic():
                if options["flush"]:
                    self.flush_catalog()

                vendors = self.seed_vendors()
                departments = self.seed_departments()
                baby_leaves, kids_leaves, women_leaves, men_leaves = self.seed_categories(departments)
                age_groups = self.seed_age_groups()
                brands = self.seed_brands()

                self.seed_baby_products(per_leaf, vendors, baby_leaves, age_groups, brands)
                self.seed_kids_products(per_leaf, vendors, kids_leaves, age_groups, brands)
                self.seed_adult_products("Women", per_leaf, vendors, women_leaves, brands)
                self.seed_adult_products("Men", per_leaf, vendors, men_leaves, brands)
        except ProtectedError:
            raise CommandError(
                "Aborted without changing anything: --flush would delete a "
                "product that's still referenced by an existing order. "
                "Remove --flush and re-run to add fresh categories/products "
                "on top of what's there instead."
            )

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
        Product.objects.all().delete()  # raises ProtectedError if an order references one
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
                defaults={"email": f"{username}@example.com", "role": User.Role.VENDOR},
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
        self.stdout.write("Seeding departments (Baby, Kids, Women, Men)...")
        departments = {}
        for name, slug, order in DEPARTMENTS:
            dept, _ = Department.objects.get_or_create(
                name=name,
                defaults={"slug": slug, "order": order, "is_active": True},
            )
            departments[name] = dept
        return departments

    # ------------------------------------------------------------------
    # CATEGORIES
    # ------------------------------------------------------------------

    def seed_categories(self, departments):
        self.stdout.write("Seeding categories...")

        # ---- Baby: 5 flat age-group categories -------------------------
        baby_leaves = []
        for name, slug, order in BABY_CATEGORIES:
            cat, _ = Category.objects.get_or_create(
                department=departments["Baby"],
                parent=None,
                name=name,
                defaults={"slug": slug, "order": order, "is_active": True},
            )
            baby_leaves.append(cat)

        # ---- Kids: 3 flat gender categories ------------------------------
        kids_leaves = []
        for name, slug, order, gender in KIDS_CATEGORIES:
            cat, _ = Category.objects.get_or_create(
                department=departments["Kids"],
                parent=None,
                name=name,
                defaults={"slug": slug, "order": order, "is_active": True},
            )
            kids_leaves.append((cat, gender))

        # ---- Women / Men: group -> leaves --------------------------------
        women_leaves = []
        men_leaves = []
        for dept_name, groups in WOMEN_MEN_TREE.items():
            department = departments[dept_name]
            bucket = women_leaves if dept_name == "Women" else men_leaves

            for group_order, (group_name, leaf_names) in enumerate(groups.items()):
                group, _ = Category.objects.get_or_create(
                    department=department,
                    parent=None,
                    name=group_name,
                    defaults={"order": group_order, "is_active": True},
                )
                for leaf_order, leaf_name in enumerate(leaf_names):
                    leaf, _ = Category.objects.get_or_create(
                        department=department,
                        parent=group,
                        name=leaf_name,
                        defaults={"order": leaf_order, "is_active": True},
                    )
                    bucket.append(leaf)

        return baby_leaves, kids_leaves, women_leaves, men_leaves

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
                    "stage": stage, "min_age_years": min_age, "max_age_years": max_age,
                    "icon": icon, "order": order, "is_active": True,
                },
            )
            by_stage[stage].append(ag)
        return by_stage

    # ------------------------------------------------------------------
    # BRANDS
    # ------------------------------------------------------------------

    def seed_brands(self):
        self.stdout.write("Seeding brands...")
        return [Brand.objects.get_or_create(name=name)[0] for name in BRANDS]

    # ------------------------------------------------------------------
    # PRODUCTS — BABY
    # ------------------------------------------------------------------

    def seed_baby_products(self, per_leaf, vendors, baby_leaves, age_groups, brands):
        self.stdout.write(f"Seeding Baby products ({per_leaf} per age group)...")
        baby_age_group = age_groups.get("baby", [None])[0]
        genders = ["girls", "boys", "unisex"]
        sizes = ["0-3M", "3-6M", "6-12M", "12-18M", "18-24M"]

        for category in baby_leaves:
            for _ in range(per_leaf):
                gender = random.choice(genders)
                product = self._create_product(
                    department_name="Baby",
                    category=category,
                    gender=gender,
                    vendors=vendors,
                    brands=brands,
                    label_source=category.name,
                    sizes=sizes,
                )
                if baby_age_group:
                    product.age_groups.set([baby_age_group])

    # ------------------------------------------------------------------
    # PRODUCTS — KIDS
    # ------------------------------------------------------------------

    def seed_kids_products(self, per_leaf, vendors, kids_leaves, age_groups, brands):
        self.stdout.write(f"Seeding Kids products ({per_leaf} per subcategory)...")
        kids_age_groups = age_groups.get("kids", [])
        sizes = ["2T", "3T", "4T", "5-6Y", "7-8Y"]

        for category, gender in kids_leaves:
            for _ in range(per_leaf):
                product = self._create_product(
                    department_name="Kids",
                    category=category,
                    gender=gender,
                    vendors=vendors,
                    brands=brands,
                    label_source=category.name,
                    sizes=sizes,
                )
                if kids_age_groups:
                    product.age_groups.set(random.sample(
                        kids_age_groups, k=min(len(kids_age_groups), random.choice([1, 1, 2]))
                    ))

    # ------------------------------------------------------------------
    # PRODUCTS — WOMEN / MEN
    # ------------------------------------------------------------------

    def seed_adult_products(self, department_name, per_leaf, vendors, leaves, brands):
        self.stdout.write(f"Seeding {department_name} products ({per_leaf} per leaf category)...")
        sizes = ["XS", "S", "M", "L", "XL"]

        for category in leaves:
            for _ in range(per_leaf):
                self._create_product(
                    department_name=department_name,
                    category=category,
                    gender="unisex",
                    vendors=vendors,
                    brands=brands,
                    label_source=category.name,
                    sizes=sizes,
                )

    # ------------------------------------------------------------------
    # SHARED PRODUCT CREATION
    # ------------------------------------------------------------------

    def _create_product(self, department_name, category, gender, vendors, brands, label_source, sizes):
        price_lo, price_hi = PRICE_RANGES[department_name]
        price = round(random.uniform(price_lo, price_hi), 2)
        on_sale = random.random() < 0.3
        compare_at_price = round(price * random.uniform(1.15, 1.6), 2) if on_sale else None

        adjective = random.choice(ADJECTIVES)
        color = random.choice(COLORS)
        product_name = f"{adjective} {color} {label_source}".strip()

        sku = f"{slugify(department_name)[:3].upper()}-{slugify(category.slug)[:8].upper()}-{Product.objects.count() + random.randint(1000, 999999)}"

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
                f"{product_name} — a {adjective.lower()} pick for {department_name}. "
                f"Comfortable, durable and easy to style."
            ),
            price=price,
            compare_at_price=compare_at_price,
            stock=stock,
            sku=sku,
            status=status,
            is_featured=is_featured,
        )

        if sizes:
            for size in random.sample(sizes, k=min(len(sizes), random.choice([2, 3]))):
                ProductVariant.objects.create(
                    product=product, size=size, color=color,
                    stock=random.randint(0, 30),
                )

        self.attach_placeholder_image(product, product_name)
        return product

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
            initials, fill=(60, 60, 60), font=font,
        )

        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=85)
        buffer.seek(0)

        ProductImage.objects.create(
            product=product,
            image=ContentFile(buffer.read(), name=f"{product.sku}.jpg"),
            alt_text=label,
            order=0,
        )
