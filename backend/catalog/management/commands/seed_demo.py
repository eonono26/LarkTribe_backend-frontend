from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from vendors.models import Vendor
from catalog.models import Department, Category, Brand, Product

User = get_user_model()

# Full category tree from the product requirements doc.
DEPARTMENTS = {
    "Women": [
        "New Arrivals", "Dresses", "Tops & T-Shirts", "Shirts & Blouses", "Jeans",
        "Trousers", "Skirts", "Activewear", "Sleepwear", "Lingerie", "Shoes",
        "Handbags", "Jewelry", "Watches", "Accessories",
    ],
    "Kids": [
        "Baby (0-24 Months)", "Girls", "Boys", "Newborn Essentials", "School Wear",
        "Shoes", "Toys", "Books", "Accessories",
    ],
    "Beauty": ["Makeup", "Skincare", "Hair Care", "Fragrances", "Personal Care"],
    "Maternity": ["Maternity Clothing", "Nursing Wear", "Baby Feeding", "Pregnancy Essentials"],
    "Home & Lifestyle": ["Home Decor", "Bedding", "Kitchen", "Storage", "Baby Room"],
}


class Command(BaseCommand):
    help = "Seed demo departments, categories, a vendor, and sample products."

    def handle(self, *args, **options):
        for i, (dept_name, cats) in enumerate(DEPARTMENTS.items()):
            dept, _ = Department.objects.get_or_create(name=dept_name, defaults={"order": i})
            for j, cat_name in enumerate(cats):
                Category.objects.get_or_create(department=dept, name=cat_name, defaults={"order": j})

        user, created = User.objects.get_or_create(
            username="demo_vendor", defaults={"email": "vendor@example.com", "role": "vendor"}
        )
        if created:
            user.set_password("demo1234")
            user.save()
        vendor, _ = Vendor.objects.get_or_create(
            user=user, defaults={"store_name": "Demo Store", "slug": "demo-store", "status": "approved"}
        )

        admin_user, created = User.objects.get_or_create(
            username="demo_admin", defaults={"email": "admin@example.com", "role": "admin", "is_staff": True, "is_superuser": True}
        )
        if created:
            admin_user.set_password("demo1234")
            admin_user.save()

        brand, _ = Brand.objects.get_or_create(name="House Brand")
        cat = Category.objects.filter(department__name="Women", name="Dresses").first()
        for i in range(1, 6):
            Product.objects.get_or_create(
                sku=f"DEMO-{i:03d}",
                defaults=dict(
                    vendor=vendor, category=cat, brand=brand,
                    name=f"Sample Dress {i}", description="Demo product for local testing.",
                    price=1500 + i * 100, stock=20, status="active", is_featured=(i <= 2),
                ),
            )
        self.stdout.write(self.style.SUCCESS(
            "Seed data created. Demo vendor: demo_vendor/demo1234. Demo admin (superuser): demo_admin/demo1234."
        ))
