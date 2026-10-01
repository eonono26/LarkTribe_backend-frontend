"""
seed_bulk_catalog — one-file bulk product seeder.

Populates a large batch of demo products spread evenly across every
department (Baby/Kids/Women/Men), every leaf category, every age group,
and every brand, so the storefront/PLP/filters have real volume to
show instead of a handful of items.

Fully idempotent for taxonomy: departments, categories, age groups,
brands, and the demo vendor are all get_or_create, so running this
command repeatedly never duplicates them. Products are always ADDED
(there's no meaningful "already exists" check for a demo product) —
use --flush to delete only the products this command previously
created (identified by their "BULK-" SKU prefix) before reseeding.

Usage:
    python manage.py seed_bulk_catalog
    python manage.py seed_bulk_catalog --count 500
    python manage.py seed_bulk_catalog --count 500 --flush
    python manage.py seed_bulk_catalog --count 500 --no-images   (faster, no PIL needed)
"""

import random
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from accounts.models import User
from vendors.models import Vendor
from catalog.models import Department, Category, AgeGroup, Brand, Product, ProductImage, ProductVariant

try:
    from PIL import Image, ImageDraw
    HAS_PIL = True
except ImportError:
    HAS_PIL = False


SKU_PREFIX = "BULK-"

# ----------------------------------------------------------------------
# Taxonomy this command guarantees exists (get_or_create — safe to re-run)
# ----------------------------------------------------------------------

DEPARTMENTS = [
    # name, slug, order
    ("Baby", "baby", 0),
    ("Kids", "kids", 1),
    ("Women", "women", 2),
    ("Men", "men", 3),
]

# department slug -> list of (category name, category slug)
CATEGORY_TREE = {
    "baby": [
        ("Bodysuits & Rompers", "baby-bodysuits-rompers"),
        ("Sleepwear", "baby-sleepwear"),
        ("Outerwear", "baby-outerwear"),
        ("Nursery & Bedding", "baby-nursery-bedding"),
        ("Feeding & Bath", "baby-feeding-bath"),
        ("Shoes & Socks", "baby-shoes-socks"),
    ],
    "kids": [
        ("Tops & T-Shirts", "kids-tops"),
        ("Bottoms & Jeans", "kids-bottoms"),
        ("Dresses & Skirts", "kids-dresses"),
        ("Outerwear", "kids-outerwear"),
        ("Sleepwear", "kids-sleepwear"),
        ("Shoes", "kids-shoes"),
        ("School & Backpacks", "kids-school"),
    ],
    "women": [
        ("Dresses", "women-dresses"),
        ("Tops & Blouses", "women-tops"),
        ("Jeans & Trousers", "women-bottoms"),
        ("Activewear", "women-activewear"),
        ("Jackets & Coats", "women-outerwear"),
        ("Shoes", "women-shoes"),
        ("Bags & Accessories", "women-accessories"),
    ],
    "men": [
        ("Shirts", "men-shirts"),
        ("T-Shirts & Polos", "men-tshirts"),
        ("Jeans & Trousers", "men-bottoms"),
        ("Shorts", "men-shorts"),
        ("Jackets & Coats", "men-outerwear"),
        ("Shoes", "men-shoes"),
        ("Bags & Accessories", "men-accessories"),
    ],
}

# name, slug, stage, min_age_years, max_age_years, icon
AGE_GROUPS = [
    ("0-24 Months", "0-24-months", AgeGroup.Stage.BABY, 0, 2, "👶"),
    ("2-3 Yrs", "2-3-yrs", AgeGroup.Stage.KIDS, 2, 3, "🧒"),
    ("4-5 Yrs", "4-5-yrs", AgeGroup.Stage.KIDS, 4, 5, "🧒"),
    ("6-8 Yrs", "6-8-yrs", AgeGroup.Stage.KIDS, 6, 8, "🧒"),
    ("9-12 Yrs", "9-12-yrs", AgeGroup.Stage.TEENS, 9, 12, "🎒"),
    ("13-17 Yrs", "13-17-yrs", AgeGroup.Stage.TEENS, 13, 17, "🎽"),
]

BRAND_NAMES = [
    "Lark Tribe Basics", "Savanna Kids", "Nairobi Knits", "Little Rift",
    "Highveld Denim", "Coastline Cotton", "Acacia & Co.", "Mara Threads",
    "Sable Studio", "Zawadi Kids", "Boma Basics", "Kilimo Wear",
    "Tuska Trail", "Karura Kids", "Nyota Nightwear",
]

GENDER_BY_DEPT = {
    # department slug -> allowed Product.Gender choices to pick from
    "baby": ["girls", "boys", "unisex"],
    "kids": ["girls", "boys", "unisex"],
    "women": ["unisex"],  # gender field here is a nav helper, not used for adult depts
    "men": ["unisex"],
}

# Word banks used to generate varied, plausible product names per category
ADJECTIVES = [
    "Classic", "Essential", "Soft-Touch", "Organic Cotton", "Everyday",
    "Signature", "Relaxed-Fit", "Lightweight", "Heavyweight", "Brushed",
    "Ribbed", "Printed", "Striped", "Quilted", "Cozy", "Breathable",
]

COLORS = [
    "Ivory", "Charcoal", "Sage", "Terracotta", "Navy", "Blush",
    "Stone", "Olive", "Mustard", "Rust", "Black", "White", "Denim Blue",
]

SIZES_ADULT = ["XS", "S", "M", "L", "XL", "XXL"]
SIZES_KIDS = ["2T", "3T", "4T", "5", "6", "7", "8"]
SIZES_BABY = ["0-3M", "3-6M", "6-12M", "12-18M", "18-24M"]


class Command(BaseCommand):
    help = "Seed a large batch of demo products spread across every department, category, age group and brand."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=500, help="Total number of products to create (default 500).")
        parser.add_argument("--flush", action="store_true", help="Delete previously bulk-seeded products (SKU prefix BULK-) before reseeding.")
        parser.add_argument("--no-images", action="store_true", help="Skip generating placeholder images (faster, no PIL required).")

    def handle(self, *args, **options):
        count = options["count"]
        make_images = HAS_PIL and not options["no_images"]

        if options["no_images"] and not HAS_PIL:
            self.stdout.write(self.style.WARNING("Pillow not installed — images will be skipped either way."))
        elif not HAS_PIL:
            self.stdout.write(self.style.WARNING("Pillow not installed — run `pip install Pillow` for placeholder images. Continuing without images."))

        if options["flush"]:
            deleted, _ = Product.objects.filter(sku__startswith=SKU_PREFIX).delete()
            self.stdout.write(self.style.WARNING(f"Flushed {deleted} previously bulk-seeded rows (products + related)."))

        with transaction.atomic():
            departments = self._seed_departments()
            categories = self._seed_categories(departments)
            age_groups = self._seed_age_groups()
            brands = self._seed_brands()
            vendor = self._seed_vendor()

        self.stdout.write(self.style.SUCCESS(
            f"Taxonomy ready: {len(departments)} departments, {len(categories)} categories, "
            f"{len(age_groups)} age groups, {len(brands)} brands."
        ))

        # Continue SKU numbering from wherever the last bulk run left off
        # so re-running without --flush never collides.
        last = Product.objects.filter(sku__startswith=SKU_PREFIX).order_by("-id").first()
        start_n = 1
        if last:
            try:
                start_n = int(last.sku.replace(SKU_PREFIX, "")) + 1
            except ValueError:
                pass

        created = 0
        for i in range(count):
            n = start_n + i
            dept, cat = random.choice(categories)
            self._create_product(n, dept, cat, age_groups, brands, vendor, make_images)
            created += 1
            if created % 50 == 0:
                self.stdout.write(f"  ...{created}/{count} products created")

        self.stdout.write(self.style.SUCCESS(f"Done — created {created} products (SKU {SKU_PREFIX}{start_n:05d}..{SKU_PREFIX}{start_n + count - 1:05d})."))

    # ------------------------------------------------------------------
    # Taxonomy helpers — all get_or_create, safe to re-run
    # ------------------------------------------------------------------

    def _seed_departments(self):
        out = {}
        for name, slug, order in DEPARTMENTS:
            dept, _ = Department.objects.get_or_create(slug=slug, defaults={"name": name, "order": order})
            out[slug] = dept
        return out

    def _seed_categories(self, departments):
        """Returns a flat list of (department, category) tuples — one entry per leaf category."""
        out = []
        for dept_slug, leaves in CATEGORY_TREE.items():
            dept = departments[dept_slug]
            for order, (name, slug) in enumerate(leaves):
                cat, _ = Category.objects.get_or_create(
                    slug=slug,
                    defaults={"name": name, "department": dept, "order": order},
                )
                out.append((dept, cat))
        return out

    def _seed_age_groups(self):
        out = []
        for order, (name, slug, stage, min_age, max_age, icon) in enumerate(AGE_GROUPS):
            ag, _ = AgeGroup.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "stage": stage,
                    "min_age_years": min_age,
                    "max_age_years": max_age,
                    "icon": icon,
                    "order": order,
                },
            )
            out.append(ag)
        return out

    def _seed_brands(self):
        out = []
        for name in BRAND_NAMES:
            slug = slugify(name)
            brand, _ = Brand.objects.get_or_create(slug=slug, defaults={"name": name})
            out.append(brand)
        return out

    def _seed_vendor(self):
        user, _ = User.objects.get_or_create(
            username="bulk_seed_vendor",
            defaults={"email": "bulkseed@larktribe.local", "role": User.Role.VENDOR},
        )
        vendor, _ = Vendor.objects.get_or_create(
            user=user,
            defaults={
                "store_name": "Lark Tribe Studio",
                "slug": "lark-tribe-studio",
                "status": Vendor.Status.APPROVED,
            },
        )
        return vendor

    # ------------------------------------------------------------------
    # Product creation
    # ------------------------------------------------------------------

    def _create_product(self, n, dept, cat, age_groups, brands, vendor, make_images):
        adjective = random.choice(ADJECTIVES)
        color = random.choice(COLORS)
        # Singularize the category name for a natural product title, e.g.
        # "Dresses" -> "Dress", "Tops & Blouses" -> "Top & Blouse".
        base_noun = cat.name.rstrip("s") if not cat.name.endswith("ss") else cat.name
        name = f"{adjective} {color} {base_noun}"

        price = random.choice([1200, 1500, 1800, 2200, 2500, 2900, 3500, 4200, 4900, 5900, 7500])
        on_sale = random.random() < 0.3
        compare_at_price = round(price * random.choice([1.15, 1.25, 1.35])) if on_sale else None

        gender = random.choice(GENDER_BY_DEPT[dept.slug])
        sku = f"{SKU_PREFIX}{n:05d}"

        product = Product.objects.create(
            vendor=vendor,
            category=cat,
            brand=random.choice(brands),
            gender=gender,
            name=name,
            description=(
                f"{adjective} {base_noun.lower()} in {color.lower()}, part of the {dept.name} collection. "
                f"Made for everyday comfort and easy care."
            ),
            features=[
                random.choice(["100% Cotton", "Machine Washable", "Pre-Shrunk", "Soft Brushed Interior", "Reinforced Seams"]),
                random.choice(["Breathable Fabric", "Fade-Resistant", "Elastic Waistband", "Adjustable Fit"]),
            ],
            price=price,
            compare_at_price=compare_at_price,
            stock=random.randint(5, 120),
            sku=sku,
            status=Product.Status.ACTIVE,
            is_featured=random.random() < 0.08,
        )

        # Attach age groups only for Baby/Kids departments (Women/Men have none — matches real taxonomy)
        if dept.slug == "baby":
            product.age_groups.set([ag for ag in age_groups if ag.stage == AgeGroup.Stage.BABY])
        elif dept.slug == "kids":
            product.age_groups.set([ag for ag in age_groups if ag.stage in (AgeGroup.Stage.KIDS, AgeGroup.Stage.TEENS)][: random.randint(1, 3)])

        # Size/colour variants
        if dept.slug == "baby":
            sizes = SIZES_BABY
        elif dept.slug == "kids":
            sizes = SIZES_KIDS
        else:
            sizes = SIZES_ADULT
        for size in random.sample(sizes, k=min(len(sizes), random.randint(3, 5))):
            ProductVariant.objects.create(
                product=product,
                size=size,
                color=color,
                stock=random.randint(0, 40),
                sku_suffix=f"{size}-{color[:3].upper()}",
            )

        if make_images:
            self._attach_placeholder_image(product, color)

    def _attach_placeholder_image(self, product, color):
        """Generates a simple solid-colour placeholder image with the product
        name overlaid, so the storefront has something real to render instead
        of a broken image icon. Swap real product photography in later."""
        palette = {
            "Ivory": (245, 240, 230), "Charcoal": (60, 58, 55), "Sage": (150, 160, 130),
            "Terracotta": (198, 120, 90), "Navy": (35, 45, 70), "Blush": (225, 190, 185),
            "Stone": (180, 172, 158), "Olive": (110, 115, 70), "Mustard": (200, 160, 60),
            "Rust": (170, 90, 55), "Black": (30, 28, 26), "White": (250, 250, 248),
            "Denim Blue": (70, 95, 130),
        }
        bg = palette.get(color, (200, 195, 185))
        img = Image.new("RGB", (900, 1125), bg)
        draw = ImageDraw.Draw(img)
        text_color = (255, 255, 255) if sum(bg) < 400 else (40, 38, 35)
        draw.text((40, 40), product.name, fill=text_color)
        draw.text((40, 1080), product.sku, fill=text_color)

        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=82)
        image = ProductImage.objects.create(
            product=product,
            alt_text=product.name,
            order=0,
        )
        image.image.save(f"{product.slug}.jpg", ContentFile(buffer.getvalue()), save=True)