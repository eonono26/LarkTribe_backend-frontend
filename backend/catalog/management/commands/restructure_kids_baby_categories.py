"""
Restructure the Kids / Babies catalogue into ONE gender-neutral category tree.

Why
---
The older seeds encoded gender in category names ("Baby Boy Jacket",
"Baby Girl Jacket", Boys > Pyjama, Girls > Pyjama, ...). That duplicates every
product type and makes the mega-menu long and confusing. Gender and age are
already first-class filters (Product.gender, AgeGroup / stage), so categories
should describe only WHAT the product is.

Result
------
Department "Kids" holds a single tree used by BOTH the Kids and Babies menus.
The menus narrow it automatically with ?stage=kids / ?stage=baby (only
categories that actually have products for that stage are shown):

    Clothing               Tops, T-Shirts, Dresses, Pants & Trousers, ...
    Baby Essentials        Onesies, Rompers, Bodysuits, Bloomers
    Footwear & Accessories Shoes, Bags, Socks, Caps & Hats, Accessories

What it does to existing data
-----------------------------
* Creates the tree above (idempotent - safe to re-run).
* Moves every product from a legacy gender/age-named category into the
  matching neutral category, so no product is lost.
* Keeps the gender the old category implied: a product that was under
  "Baby Girls" / "Girls" and still has the default "unisex" becomes "girls"
  (same for boys). Products with an explicit gender are never changed.
* Legacy categories are DEACTIVATED (hidden from the API, reversible), not
  deleted. Use --delete-legacy to remove empty ones for good.
* Products that came from the Baby tree but have no baby-stage age group
  (or from Gen Z with no teens age group) will not show under Babies/Kids
  filters. They are reported; pass --assign-missing-age-groups to attach all
  age groups of the implied stage to them.

Usage
-----
    python manage.py restructure_kids_baby_categories --dry-run
    python manage.py restructure_kids_baby_categories
    python manage.py restructure_kids_baby_categories --assign-missing-age-groups
"""

import re
from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from catalog.models import AgeGroup, Category, Department, Product

TREE = {
    "Clothing": [
        "Tops", "T-Shirts", "Shirts", "Dresses", "Skirts", "Pants & Trousers",
        "Jeans", "Shorts", "Leggings", "Sets", "Jumpsuits", "Jackets & Coats",
        "Hoodies & Sweatshirts", "Sweaters & Cardigans", "Pyjamas & Sleepwear",
        "Kaftans", "Soiree", "Swimwear", "Sportswear & Loungewear",
    ],
    "Baby Essentials": ["Onesies", "Rompers", "Bodysuits", "Bloomers"],
    "Footwear & Accessories": ["Shoes", "Bags", "Socks", "Caps & Hats", "Accessories"],
}

# normalised legacy leaf name -> new leaf name
ALIASES = {
    "pyjama": "Pyjamas & Sleepwear", "pyjamas": "Pyjamas & Sleepwear",
    "pajamas": "Pyjamas & Sleepwear", "sleepwear": "Pyjamas & Sleepwear",
    "dress": "Dresses", "dresses": "Dresses",
    "jacket": "Jackets & Coats", "jackets": "Jackets & Coats", "blazers": "Jackets & Coats",
    "kaftan": "Kaftans", "kaftans": "Kaftans",
    "pants": "Pants & Trousers", "bottoms": "Pants & Trousers", "trousers": "Pants & Trousers",
    "jeans": "Jeans",
    "set": "Sets", "sets": "Sets", "co-ords": "Sets",
    "shorts": "Shorts",
    "swimming wear": "Swimwear", "swimwear": "Swimwear",
    "tops": "Tops", "t-shirts": "T-Shirts", "shirts": "Shirts",
    "skirts": "Skirts", "soiree": "Soiree",
    "hoodies & sweatshirts": "Hoodies & Sweatshirts",
    "sweaters": "Sweaters & Cardigans", "sweaters & cardigans": "Sweaters & Cardigans",
    "jumpsuits": "Jumpsuits", "leggings": "Leggings",
    "sportswear": "Sportswear & Loungewear", "loungewear": "Sportswear & Loungewear",
    "onesie": "Onesies", "onesies": "Onesies",
    "rompers": "Rompers", "romper": "Rompers",
    "bodysuits": "Bodysuits", "bodysuit": "Bodysuits",
    "bloomers": "Bloomers",
    "shoes": "Shoes", "shoes & booties": "Shoes",
    "hats & caps": "Caps & Hats", "caps & hats": "Caps & Hats",
    "hats & headbands": "Caps & Hats",
    "bags": "Bags", "socks": "Socks", "accessories": "Accessories",
}

PREFIX_RE = re.compile(r"^(baby\s+(boy|girl)s?\s+|baby\s+|gen\s*z\s+)", re.I)


def map_name(name: str):
    key = PREFIX_RE.sub("", name.strip()).strip().lower()
    return ALIASES.get(key)


def path_names(cat, by_id):
    names = []
    while cat is not None:
        names.append(cat.name)
        cat = by_id.get(cat.parent_id)
    return list(reversed(names))


def infer_gender(names):
    joined = " ".join(names).lower()
    if re.search(r"\bgirls?\b", joined):
        return "girls"
    if re.search(r"\bboys?\b", joined):
        return "boys"
    return None


def infer_stage(names):
    top = " ".join(names).lower()
    if "gen z" in top:
        return "teens"
    if re.search(r"\bbaby\b|\bmonths?\b", top):
        return "baby"
    return None


class Command(BaseCommand):
    help = "Collapse gender/age-named Kids & Baby categories into one neutral tree."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Show the plan; change nothing.")
        parser.add_argument("--delete-legacy", action="store_true",
                            help="Delete empty legacy categories instead of deactivating them.")
        parser.add_argument("--assign-missing-age-groups", action="store_true",
                            help="Give moved Baby/Gen Z products all age groups of their implied stage if they have none.")

    @transaction.atomic
    def handle(self, *args, **opts):
        dry = opts["dry_run"]
        out = self.stdout.write

        kids, _ = Department.objects.get_or_create(
            name="Kids", defaults={"slug": "kids", "order": 1, "is_active": True}
        )

        # ---- 1. build the neutral tree ------------------------------------
        new_leaf = {}       # leaf name -> Category
        new_ids = set()
        for g_order, (group, leaves) in enumerate(TREE.items()):
            g_slug = f"kids-{slugify(group)}"
            group_cat, _ = Category.objects.get_or_create(
                slug=g_slug,
                defaults={"department": kids, "parent": None, "name": group, "order": g_order, "is_active": True},
            )
            if not group_cat.is_active:
                group_cat.is_active = True
                group_cat.save(update_fields=["is_active"])
            new_ids.add(group_cat.id)
            for l_order, leaf in enumerate(leaves):
                cat, created = Category.objects.get_or_create(
                    slug=f"kids-{slugify(leaf)}",
                    defaults={"department": kids, "parent": group_cat, "name": leaf, "order": l_order, "is_active": True},
                )
                new_leaf[leaf] = cat
                new_ids.add(cat.id)
                if created:
                    out(f"  + {group} / {leaf}")

        # ---- 2. plan the moves --------------------------------------------
        legacy_qs = Category.objects.filter(department__slug__in=["kids", "baby"]).exclude(id__in=new_ids)
        legacy = list(legacy_qs.select_related("parent"))
        by_id = {c.id: c for c in Category.objects.filter(department__slug__in=["kids", "baby"])}

        moved = defaultdict(int)
        unmapped = []
        need_age = defaultdict(list)     # stage -> product ids lacking an age group of that stage
        gender_changes = 0

        for cat in legacy:
            n_products = Product.objects.filter(category=cat).count()
            if n_products == 0:
                continue
            target_name = map_name(cat.name)
            if target_name is None:
                unmapped.append((cat, n_products))
                continue

            names = path_names(cat, by_id)
            gender = infer_gender(names)
            stage = infer_stage(names)
            target = new_leaf[target_name]
            prod_ids = list(Product.objects.filter(category=cat).values_list("id", flat=True))

            out(f"  {' > '.join(names)}  ->  {target.parent.name} / {target.name}  ({n_products} products)")
            moved[target_name] += n_products
            if dry:
                continue

            if gender:
                gender_changes += Product.objects.filter(id__in=prod_ids, gender="unisex").update(gender=gender)
            if stage:
                have = set(
                    Product.objects.filter(id__in=prod_ids, age_groups__stage=stage).values_list("id", flat=True)
                )
                need_age[stage].extend(pid for pid in prod_ids if pid not in have)
            Product.objects.filter(id__in=prod_ids).update(category=target)

        # ---- 3. age-group gaps --------------------------------------------
        for stage, ids in need_age.items():
            if not ids:
                continue
            if opts["assign_missing_age_groups"]:
                groups = list(AgeGroup.objects.filter(stage=stage, is_active=True))
                for p in Product.objects.filter(id__in=ids):
                    p.age_groups.add(*groups)
                out(f"  Attached {len(groups)} '{stage}' age groups to {len(ids)} products that had none.")
            else:
                out(self.style.WARNING(
                    f"  {len(ids)} moved products have no '{stage}' age group, so they will not appear in the "
                    f"{stage} menu/filters. Re-run with --assign-missing-age-groups or tag them in admin."
                ))

        if dry:
            out(self.style.WARNING("Dry run - nothing was changed."))
            transaction.set_rollback(True)
            return

        # ---- 4. retire legacy categories ----------------------------------
        retired = 0
        blocked = {c.id for c, _ in unmapped}
        for cat in sorted(legacy, key=lambda c: -len(path_names(c, by_id))):  # deepest first
            if cat.id in blocked or Product.objects.filter(category=cat).exists():
                continue
            if opts["delete_legacy"] and not Category.objects.filter(parent=cat).exists():
                cat.delete()
            else:
                if cat.is_active:
                    cat.is_active = False
                    cat.save(update_fields=["is_active"])
            retired += 1

        out(self.style.SUCCESS(
            f"Done. Moved {sum(moved.values())} products, set gender on {gender_changes}, "
            f"{'deleted' if opts['delete_legacy'] else 'deactivated'} {retired} legacy categories."
        ))
        if unmapped:
            out(self.style.WARNING("Left in place (no matching neutral category) - move these by hand in admin:"))
            for c, n in unmapped:
                out(f"    {' > '.join(path_names(c, by_id))}  ({n} products)")
