# from django.core.management.base import BaseCommand
# from django.contrib.auth import get_user_model
# from vendors.models import Vendor
# from catalog.models import Department, Category, Brand, Product

# User = get_user_model()

# # Full category tree from the product requirements doc.
# DEPARTMENTS = {
#     "Women": [
#         "New Arrivals", "Dresses", "Tops & T-Shirts", "Shirts & Blouses", "Jeans",
#         "Trousers", "Skirts", "Activewear", "Sleepwear", "Lingerie", "Shoes",
#         "Handbags", "Jewelry", "Watches", "Accessories",
#     ],
#     "Kids": [
#         "Baby (0-24 Months)", "Girls", "Boys", "Newborn Essentials", "School Wear",
#         "Shoes", "Toys", "Books", "Accessories",
#     ],
#     "Beauty": ["Makeup", "Skincare", "Hair Care", "Fragrances", "Personal Care"],
#     "Maternity": ["Maternity Clothing", "Nursing Wear", "Baby Feeding", "Pregnancy Essentials"],
#     "Home & Lifestyle": ["Home Decor", "Bedding", "Kitchen", "Storage", "Baby Room"],
# }


# class Command(BaseCommand):
#     help = "Seed demo departments, categories, a vendor, and sample products."

#     def handle(self, *args, **options):
#         for i, (dept_name, cats) in enumerate(DEPARTMENTS.items()):
#             dept, _ = Department.objects.get_or_create(name=dept_name, defaults={"order": i})
#             for j, cat_name in enumerate(cats):
#                 Category.objects.get_or_create(department=dept, name=cat_name, defaults={"order": j})

#         user, created = User.objects.get_or_create(
#             username="demo_vendor", defaults={"email": "vendor@example.com", "role": "vendor"}
#         )
#         if created:
#             user.set_password("demo1234")
#             user.save()
#         vendor, _ = Vendor.objects.get_or_create(
#             user=user, defaults={"store_name": "Demo Store", "slug": "demo-store", "status": "approved"}
#         )

#         admin_user, created = User.objects.get_or_create(
#             username="demo_admin", defaults={"email": "admin@example.com", "role": "admin", "is_staff": True, "is_superuser": True}
#         )
#         if created:
#             admin_user.set_password("demo1234")
#             admin_user.save()

#         brand, _ = Brand.objects.get_or_create(name="House Brand")
#         cat = Category.objects.filter(department__name="Women", name="Dresses").first()
#         for i in range(1, 6):
#             Product.objects.get_or_create(
#                 sku=f"DEMO-{i:03d}",
#                 defaults=dict(
#                     vendor=vendor, category=cat, brand=brand,
#                     name=f"Sample Dress {i}", description="Demo product for local testing.",
#                     price=1500 + i * 100, stock=20, status="active", is_featured=(i <= 2),
#                 ),
#             )
#         self.stdout.write(self.style.SUCCESS(
#             "Seed data created. Demo vendor: demo_vendor/demo1234. Demo admin (superuser): demo_admin/demo1234."
#         ))


# from django.core.management.base import BaseCommand
# from django.contrib.auth import get_user_model
# from vendors.models import Vendor
# from catalog.models import Department, Category, Brand, Product
# from faker import Faker
# import random

# User = get_user_model()

# # Product data templates for Women
# WOMEN_PRODUCTS = {
#     "Dresses": {
#         "names": ["Floral Print Dress", "Bodycon Dress", "A-Line Dress", "Maxi Dress", "Wrap Dress", 
#                   "Shift Dress", "Slip Dress", "Midi Dress", "Sundress", "Cocktail Dress"],
#         "descriptions": ["Elegant and comfortable", "Perfect for any occasion", "Made with premium fabric",
#                         "Stylish and versatile", "Trendy design", "Classic silhouette"]
#     },
#     "Tops & T-Shirts": {
#         "names": ["Basic T-Shirt", "V-Neck Top", "Graphic Tee", "Button-Down Shirt", "Blouse", 
#                   "Tank Top", "Henley Top", "Polo Shirt", "Crop Top", "Tunic"],
#         "descriptions": ["Essential wardrobe piece", "Soft and breathable", "Versatile style", 
#                         "Perfect for layering", "Comfortable fit"]
#     },
#     "Jeans": {
#         "names": ["Skinny Jeans", "Straight Leg Jeans", "Bootcut Jeans", "Mom Jeans", "Boyfriend Jeans",
#                   "High-Rise Jeans", "Mid-Rise Jeans", "Flared Jeans", "Ripped Jeans", "Wide-Leg Jeans"],
#         "descriptions": ["Classic denim style", "Stretchy and comfortable", "Perfect for daily wear",
#                         "Trendy design", "Quality fabric"]
#     },
#     "Shoes": {
#         "names": ["High Heels", "Sneakers", "Sandals", "Boots", "Flats", "Wedges", "Loafers", 
#                   "Athletic Shoes", "Ankle Boots", "Espadrilles"],
#         "descriptions": ["Stylish and comfortable", "Perfect for any outfit", "Quality materials",
#                         "Durable construction", "Fashion-forward design"]
#     },
#     "Handbags": {
#         "names": ["Tote Bag", "Crossbody Bag", "Shoulder Bag", "Clutch", "Backpack", "Satchel",
#                   "Bucket Bag", "Hobo Bag", "Messenger Bag", "Wristlet"],
#         "descriptions": ["Spacious and stylish", "Premium quality materials", "Versatile accessory",
#                         "Perfect for daily use"]
#     },
#     "Activewear": {
#         "names": ["Yoga Leggings", "Sports Bra", "Running Shorts", "Tank Top", "Jacket", 
#                   "Joggers", "Bike Shorts", "Athletic Skirt", "Training Top", "Fitness Dress"],
#         "descriptions": ["High-performance fabric", "Moisture-wicking", "Flexible and stretchy",
#                         "Perfect for workouts", "Comfortable fit"]
#     },
#     "Jewelry": {
#         "names": ["Necklace", "Earrings", "Bracelet", "Ring", "Anklet", "Brooch", 
#                   "Charm Bracelet", "Stud Earrings", "Pendant Necklace", "Cuff Bracelet"],
#         "descriptions": ["Elegant design", "Premium materials", "Perfect for gifting",
#                         "Trendy accessory", "Durable construction"]
#     }
# }

# # Product data templates for Kids
# KIDS_PRODUCTS = {
#     "Baby (0-24 Months)": {
#         "names": ["Onesie", "Footed Pajamas", "Baby Romper", "Sleep Sack", "Swaddle Blanket",
#                   "Baby Gown", "Bodysuit", "Baby Pants", "Baby Hat", "Baby Booties"],
#         "descriptions": ["Soft and gentle on baby's skin", "Easy to put on and take off",
#                         "Perfect for sleeping", "Safe and comfortable", "Adorable design"]
#     },
#     "Girls": {
#         "names": ["Princess Dress", "Leggings", "Tunic Top", "Sweater", "Skirt", 
#                   "Denim Shorts", "Cardigan", "Sundress", "Pajama Set", "Rainbow Dress"],
#         "descriptions": ["Cute and comfortable", "Perfect for playtime", "Trendy styles",
#                         "Soft fabrics", "Easy care"]
#     },
#     "Boys": {
#         "names": ["Graphic T-Shirt", "Cargo Pants", "Hoodie", "Shorts", "Polo Shirt",
#                   "Jeans", "Jacket", "Track Pants", "Button-Up Shirt", "Basketball Jersey"],
#         "descriptions": ["Durable and comfortable", "Perfect for active play", "Cool designs",
#                         "Quality materials", "Easy to wear"]
#     },
#     "School Wear": {
#         "names": ["School Polo", "Pleated Skirt", "Trousers", "Blazer", "Knit Sweater",
#                   "White Shirt", "Kilt", "Pinafore", "Waistcoat", "School Tie"],
#         "descriptions": ["Durable for daily wear", "Classic school style", "Easy to care for",
#                         "Comfortable fit", "Professional look"]
#     },
#     "Shoes (Kids)": {
#         "names": ["Sneakers", "Sandals", "Boots", "Mary Janes", "Athletic Shoes",
#                   "Plimsolls", "Flip Flops", "Toddler Shoes", "Walking Shoes", "Rain Boots"],
#         "descriptions": ["Supports growing feet", "Durable construction", "Comfortable fit",
#                         "Easy to put on", "Active wear"]
#     },
#     "Toys": {
#         "names": ["Building Blocks", "Puzzle", "Action Figure", "Doll", "Stuffed Animal",
#                   "Remote Control Car", "Board Game", "Arts Set", "Musical Toy", "Learning Toy"],
#         "descriptions": ["Educational and fun", "Safe for children", "Develops creativity",
#                         "Durable and colorful", "Interactive play"]
#     }
# }

# class Command(BaseCommand):
#     help = "Seed 1000 products for Women and Kids categories"

#     def add_arguments(self, parser):
#         parser.add_argument(
#             '--clear',
#             action='store_true',
#             help='Clear existing products before adding new ones',
#         )

#     def generate_product_name(self, category_name, department_name=None):
#         """Generate a realistic product name based on category"""
#         # Check if category exists in WOMEN_PRODUCTS
#         if category_name in WOMEN_PRODUCTS:
#             name = random.choice(WOMEN_PRODUCTS[category_name]["names"])
#             if department_name:
#                 return f"{name} - {department_name}"
#             return name
        
#         # Check if category exists in KIDS_PRODUCTS
#         if category_name in KIDS_PRODUCTS:
#             name = random.choice(KIDS_PRODUCTS[category_name]["names"])
#             if department_name:
#                 return f"{name} - {department_name}"
#             return name
        
#         return f"{category_name} Product {random.randint(1, 999)}"

#     def generate_description(self, category_name):
#         """Generate a realistic product description"""
#         # Check WOMEN_PRODUCTS
#         if category_name in WOMEN_PRODUCTS:
#             descs = WOMEN_PRODUCTS[category_name]["descriptions"]
#             selected = random.sample(descs, min(3, len(descs)))
#             return " ".join(selected) + ". Available in multiple sizes and colors."
        
#         # Check KIDS_PRODUCTS
#         if category_name in KIDS_PRODUCTS:
#             descs = KIDS_PRODUCTS[category_name]["descriptions"]
#             selected = random.sample(descs, min(3, len(descs)))
#             return " ".join(selected) + ". Available in multiple sizes and colors."
        
#         return "Quality product. Great value. Satisfaction guaranteed. Available in multiple sizes and colors."

#     def handle(self, *args, **options):
#         # Initialize Faker
#         fake = Faker()
        
#         # Clear existing products if requested
#         if options.get('clear'):
#             self.stdout.write("Clearing existing products...")
#             Product.objects.all().delete()
#             self.stdout.write("Products cleared.")

#         # Get or create vendor
#         user, created = User.objects.get_or_create(
#             username="demo_vendor", 
#             defaults={"email": "vendor@example.com", "role": "vendor"}
#         )
#         if created:
#             user.set_password("demo1234")
#             user.save()
        
#         vendor, _ = Vendor.objects.get_or_create(
#             user=user, 
#             defaults={"store_name": "Demo Store", "slug": "demo-store", "status": "approved"}
#         )

#         # Get or create admin
#         admin_user, created = User.objects.get_or_create(
#             username="demo_admin", 
#             defaults={
#                 "email": "admin@example.com", 
#                 "role": "admin", 
#                 "is_staff": True, 
#                 "is_superuser": True
#             }
#         )
#         if created:
#             admin_user.set_password("demo1234")
#             admin_user.save()

#         # Create default brand
#         brand, _ = Brand.objects.get_or_create(name="House Brand")

#         # Get all Women and Kids categories
#         women_categories = Category.objects.filter(department__name="Women")
#         kids_categories = Category.objects.filter(department__name="Kids")
#         all_categories = list(women_categories) + list(kids_categories)

#         if not all_categories:
#             self.stdout.write(self.style.ERROR("No Women or Kids categories found. Please run the seed command first."))
#             return

#         products_created = 0
#         total_products = 1000

#         self.stdout.write(f"Starting to create {total_products} products...")

#         for i in range(total_products):
#             # Select a random category
#             category = random.choice(all_categories)
#             category_name = category.name
#             department_name = category.department.name
            
#             # Generate product data
#             name = self.generate_product_name(category_name, department_name)
#             description = self.generate_description(category_name)
#             price = random.randint(500, 5000)  # Random price between 500 and 5000
#             stock = random.randint(5, 100)
#             status = random.choices(['active', 'inactive'], weights=[90, 10])[0]  # 90% active
#             is_featured = random.choices([True, False], weights=[15, 85])[0]  # 15% featured
            
#             # Generate unique SKU
#             dept_prefix = department_name[:3].upper()
#             cat_prefix = category_name[:3].upper()
#             random_num = random.randint(1000, 9999)
#             sku = f"{dept_prefix}{cat_prefix}{random_num}"

#             # Create the product
#             try:
#                 product = Product.objects.create(
#                     vendor=vendor,
#                     category=category,
#                     brand=brand,
#                     sku=sku,
#                     name=name[:255],  # Ensure name doesn't exceed max length
#                     description=description[:500],  # Limit description length
#                     price=price,
#                     stock=stock,
#                     status=status,
#                     is_featured=is_featured,
#                 )
#                 products_created += 1
                
#                 # Progress indicator
#                 if (i + 1) % 100 == 0:
#                     self.stdout.write(f"Created {i + 1} products...")
                    
#             except Exception as e:
#                 self.stdout.write(self.style.WARNING(f"Failed to create product {i+1}: {str(e)}"))
#                 continue

#         self.stdout.write(self.style.SUCCESS(
#             f"Successfully created {products_created} products for Women and Kids categories."
#         ))
        
#         # Display summary statistics
#         women_count = Product.objects.filter(category__department__name="Women").count()
#         kids_count = Product.objects.filter(category__department__name="Kids").count()
        
#         self.stdout.write(f"""
#         Summary:
#         - Total products: {products_created}
#         - Women products: {women_count}
#         - Kids products: {kids_count}
#         - Vendor: {vendor.store_name} (username: demo_vendor / password: demo1234)
#         - Admin: demo_admin / demo1234
#         - Brand: {brand.name}
        
#         To view products, visit: http://localhost:8000/api/catalog/products/
#         """)

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from vendors.models import Vendor
from catalog.models import Department, Category, Brand, Product
from faker import Faker
import random

User = get_user_model()

# Product data templates for ALL departments
PRODUCT_TEMPLATES = {
    "Women": {
        "Dresses": {
            "names": ["Floral Print Dress", "Bodycon Dress", "A-Line Dress", "Maxi Dress", "Wrap Dress", 
                      "Shift Dress", "Slip Dress", "Midi Dress", "Sundress", "Cocktail Dress"],
            "descriptions": ["Elegant and comfortable", "Perfect for any occasion", "Made with premium fabric",
                            "Stylish and versatile", "Trendy design", "Classic silhouette"]
        },
        "Tops & T-Shirts": {
            "names": ["Basic T-Shirt", "V-Neck Top", "Graphic Tee", "Button-Down Shirt", "Blouse", 
                      "Tank Top", "Henley Top", "Polo Shirt", "Crop Top", "Tunic"],
            "descriptions": ["Essential wardrobe piece", "Soft and breathable", "Versatile style", 
                            "Perfect for layering", "Comfortable fit"]
        },
        "Shirts & Blouses": {
            "names": ["Silk Blouse", "Cotton Shirt", "Lace Blouse", "Button-Up Shirt", "Peplum Top",
                      "Off-Shoulder Blouse", "Wrap Blouse", "Tie-Neck Blouse", "Puff Sleeve Top"],
            "descriptions": ["Chic and sophisticated", "Premium quality fabric", "Versatile styling",
                            "Perfect for work or casual", "Elegant design"]
        },
        "Jeans": {
            "names": ["Skinny Jeans", "Straight Leg Jeans", "Bootcut Jeans", "Mom Jeans", "Boyfriend Jeans",
                      "High-Rise Jeans", "Mid-Rise Jeans", "Flared Jeans", "Ripped Jeans", "Wide-Leg Jeans"],
            "descriptions": ["Classic denim style", "Stretchy and comfortable", "Perfect for daily wear",
                            "Trendy design", "Quality fabric"]
        },
        "Trousers": {
            "names": ["Tailored Trousers", "Wide-Leg Pants", "Cropped Pants", "Palazzo Pants", "Culottes",
                      "Paperbag Waist Pants", "Pleated Trousers", "Cargo Pants", "Linen Pants"],
            "descriptions": ["Professional and stylish", "Comfortable fit", "Versatile wardrobe staple",
                            "Perfect for office wear", "Quality material"]
        },
        "Skirts": {
            "names": ["A-Line Skirt", "Pencil Skirt", "Pleated Skirt", "Midi Skirt", "Mini Skirt",
                      "Maxi Skirt", "Wrap Skirt", "Denim Skirt", "Tulle Skirt", "Satin Skirt"],
            "descriptions": ["Flattering silhouette", "Versatile styling", "Comfortable and chic",
                            "Perfect for any occasion", "Elegant design"]
        },
        "Activewear": {
            "names": ["Yoga Leggings", "Sports Bra", "Running Shorts", "Tank Top", "Jacket", 
                      "Joggers", "Bike Shorts", "Athletic Skirt", "Training Top", "Fitness Dress"],
            "descriptions": ["High-performance fabric", "Moisture-wicking", "Flexible and stretchy",
                            "Perfect for workouts", "Comfortable fit"]
        },
        "Sleepwear": {
            "names": ["Pajama Set", "Nightgown", "Sleep Shirt", "Romper", "Robe",
                      "Chemise", "Sleep Shorts Set", "Nightie", "Loungewear Set"],
            "descriptions": ["Soft and cozy", "Perfect for sleeping", "Comfortable fabric",
                            "Relaxing fit", "Beautiful design"]
        },
        "Lingerie": {
            "names": ["Bra Set", "Bralette", "Panties", "Bodysuit", "Teddy",
                      "Corset", "Babydoll", "Chemise", "Stockings", "Suspender Belt"],
            "descriptions": ["Elegant and comfortable", "Premium quality lace", "Perfect fit",
                            "Beautiful design", "Sensual comfort"]
        },
        "Shoes": {
            "names": ["High Heels", "Sneakers", "Sandals", "Boots", "Flats", "Wedges", "Loafers", 
                      "Athletic Shoes", "Ankle Boots", "Espadrilles"],
            "descriptions": ["Stylish and comfortable", "Perfect for any outfit", "Quality materials",
                            "Durable construction", "Fashion-forward design"]
        },
        "Handbags": {
            "names": ["Tote Bag", "Crossbody Bag", "Shoulder Bag", "Clutch", "Backpack", "Satchel",
                      "Bucket Bag", "Hobo Bag", "Messenger Bag", "Wristlet"],
            "descriptions": ["Spacious and stylish", "Premium quality materials", "Versatile accessory",
                            "Perfect for daily use"]
        },
        "Jewelry": {
            "names": ["Necklace", "Earrings", "Bracelet", "Ring", "Anklet", "Brooch", 
                      "Charm Bracelet", "Stud Earrings", "Pendant Necklace", "Cuff Bracelet"],
            "descriptions": ["Elegant design", "Premium materials", "Perfect for gifting",
                            "Trendy accessory", "Durable construction"]
        },
        "Watches": {
            "names": ["Analog Watch", "Digital Watch", "Chronograph Watch", "Diamond Watch", "Leather Strap Watch",
                      "Metal Band Watch", "Smart Watch", "Fitness Tracker", "Gold Watch", "Silver Watch"],
            "descriptions": ["Precision timekeeping", "Elegant design", "Durable construction",
                            "Perfect for any occasion", "Quality craftsmanship"]
        },
        "Accessories": {
            "names": ["Scarf", "Belt", "Hat", "Sunglasses", "Gloves", "Hair Accessories",
                      "Umbrella", "Wallet", "Keychain", "Phone Case"],
            "descriptions": ["Stylish accessory", "Quality materials", "Perfect finishing touch",
                            "Trendy design", "Versatile use"]
        }
    },
    "Kids": {
        "Baby (0-24 Months)": {
            "names": ["Onesie", "Footed Pajamas", "Baby Romper", "Sleep Sack", "Swaddle Blanket",
                      "Baby Gown", "Bodysuit", "Baby Pants", "Baby Hat", "Baby Booties"],
            "descriptions": ["Soft and gentle on baby's skin", "Easy to put on and take off",
                            "Perfect for sleeping", "Safe and comfortable", "Adorable design"]
        },
        "Girls": {
            "names": ["Princess Dress", "Leggings", "Tunic Top", "Sweater", "Skirt", 
                      "Denim Shorts", "Cardigan", "Sundress", "Pajama Set", "Rainbow Dress"],
            "descriptions": ["Cute and comfortable", "Perfect for playtime", "Trendy styles",
                            "Soft fabrics", "Easy care"]
        },
        "Boys": {
            "names": ["Graphic T-Shirt", "Cargo Pants", "Hoodie", "Shorts", "Polo Shirt",
                      "Jeans", "Jacket", "Track Pants", "Button-Up Shirt", "Basketball Jersey"],
            "descriptions": ["Durable and comfortable", "Perfect for active play", "Cool designs",
                            "Quality materials", "Easy to wear"]
        },
        "Newborn Essentials": {
            "names": ["Newborn Onesie Set", "Receiving Blanket", "Burp Cloths", "Baby Mittens", "Booties Set",
                      "Newborn Hat", "Swaddle Wrap", "Baby Gown Set", "Crib Sheet", "Nappy Cover"],
            "descriptions": ["Essential for newborns", "Soft and gentle", "Safe materials",
                            "Perfect for baby care", "Quality essentials"]
        },
        "School Wear": {
            "names": ["School Polo", "Pleated Skirt", "Trousers", "Blazer", "Knit Sweater",
                      "White Shirt", "Kilt", "Pinafore", "Waistcoat", "School Tie"],
            "descriptions": ["Durable for daily wear", "Classic school style", "Easy to care for",
                            "Comfortable fit", "Professional look"]
        },
        "Shoes": {
            "names": ["Sneakers", "Sandals", "Boots", "Mary Janes", "Athletic Shoes",
                      "Plimsolls", "Flip Flops", "Toddler Shoes", "Walking Shoes", "Rain Boots"],
            "descriptions": ["Supports growing feet", "Durable construction", "Comfortable fit",
                            "Easy to put on", "Active wear"]
        },
        "Toys": {
            "names": ["Building Blocks", "Puzzle", "Action Figure", "Doll", "Stuffed Animal",
                      "Remote Control Car", "Board Game", "Arts Set", "Musical Toy", "Learning Toy"],
            "descriptions": ["Educational and fun", "Safe for children", "Develops creativity",
                            "Durable and colorful", "Interactive play"]
        },
        "Books": {
            "names": ["Picture Book", "Story Book", "Activity Book", "Coloring Book", "Board Book",
                      "Educational Book", "Fairy Tale Collection", "Animal Book", "Alphabet Book", "Numbers Book"],
            "descriptions": ["Engaging and educational", "Colorful illustrations", "Develops reading skills",
                            "Perfect for learning", "Quality content"]
        },
        "Accessories": {
            "names": ["Kids Hat", "Kids Scarf", "Kids Belt", "Kids Sunglasses", "Kids Backpack",
                      "Lunch Box", "Water Bottle", "Hair Bows", "Socks Set", "Kids Watch"],
            "descriptions": ["Fun and functional", "Safe materials", "Perfect for kids",
                            "Colorful designs", "Durable construction"]
        }
    },
    "Beauty": {
        "Makeup": {
            "names": ["Foundation", "Concealer", "Powder", "Blush", "Bronzer",
                      "Highlighter", "Eyeshadow Palette", "Mascara", "Eyeliner", "Lipstick"],
            "descriptions": ["Long-lasting formula", "Perfect finish", "Cruelty-free",
                            "Professional quality", "Flawless coverage"]
        },
        "Skincare": {
            "names": ["Facial Cleanser", "Moisturizer", "Serum", "Sunscreen", "Face Mask",
                      "Eye Cream", "Toner", "Exfoliator", "Night Cream", "Vitamin C Serum"],
            "descriptions": ["Nourishing formula", "Dermatologist tested", "Hydrating",
                            "Anti-aging benefits", "Natural ingredients"]
        },
        "Hair Care": {
            "names": ["Shampoo", "Conditioner", "Hair Mask", "Hair Oil", "Leave-in Conditioner",
                      "Dry Shampoo", "Hair Serum", "Scalp Treatment", "Heat Protectant", "Hair Spray"],
            "descriptions": ["Nourishes and strengthens", "Adds shine and volume", "Salon-quality",
                            "Natural ingredients", "Suitable for all hair types"]
        },
        "Fragrances": {
            "names": ["Eau de Parfum", "Eau de Toilette", "Perfume Oil", "Body Mist", "Cologne",
                      "Rollerball Perfume", "Gift Set", "Travel Spray", "Luxury Fragrance"],
            "descriptions": ["Long-lasting scent", "Beautiful fragrance notes", "Premium quality",
                            "Perfect for gifting", "Signature scent"]
        },
        "Personal Care": {
            "names": ["Body Lotion", "Hand Cream", "Foot Cream", "Shower Gel", "Body Scrub",
                      "Deodorant", "Lip Balm", "Nail Care Set", "Cotton Swabs", "Face Wipes"],
            "descriptions": ["Essential daily care", "Moisturizing formula", "Gentle on skin",
                            "Quality ingredients", "Convenient use"]
        }
    },
    "Maternity": {
        "Maternity Clothing": {
            "names": ["Maternity Dress", "Maternity Leggings", "Maternity Jeans", "Nursing Top", "Maternity Blouse",
                      "Maternity Shorts", "Maternity Tunic", "Maternity Nightgown", "Maternity Swimsuit", "Maternity Coat"],
            "descriptions": ["Comfortable and stylish", "Designed for growing belly", "Breathable fabric",
                            "Easy nursing access", "Supportive design"]
        },
        "Nursing Wear": {
            "names": ["Nursing Bra", "Nursing Tank Top", "Nursing Dress", "Nursing Cover", "Nursing Pajamas",
                      "Nursing Sweater", "Nursing Shirt", "Nursing Sleep Bra", "Nursing Camisole", "Nursing Hoodie"],
            "descriptions": ["Easy nursing access", "Comfortable and supportive", "Stylish design",
                            "Discreet feeding", "Premium cotton"]
        },
        "Baby Feeding": {
            "names": ["Breast Pump", "Baby Bottle Set", "Nipple Cream", "Nursing Pillow", "Bottle Warmer",
                      "Sterilizer", "Breast Milk Storage Bags", "Baby Formula", "Burp Cloths", "Feeding Bibs"],
            "descriptions": ["Essential for feeding", "BPA-free materials", "Easy to clean",
                            "Safe and hygienic", "Convenient design"]
        },
        "Pregnancy Essentials": {
            "names": ["Pregnancy Pillow", "Compression Socks", "Maternity Belt", "Stretch Mark Cream", "Prenatal Vitamins",
                      "Belly Oil", "Body Pillow", "Back Support Belt", "Pregnancy Tea", "TENS Machine"],
            "descriptions": ["Essential for pregnancy", "Comfort and support", "Relieves discomfort",
                            "Natural ingredients", "Doctor recommended"]
        }
    },
    "Home & Lifestyle": {
        "Home Decor": {
            "names": ["Throw Pillow", "Decorative Vase", "Wall Art", "Table Runner", "Candle Holder",
                      "Photo Frame", "Area Rug", "Mirror", "Decorative Tray", "Ornament"],
            "descriptions": ["Beautiful home accent", "Elegant design", "Quality craftsmanship",
                            "Perfect for decorating", "Stylish addition"]
        },
        "Bedding": {
            "names": ["Duvet Cover Set", "Bed Sheet Set", "Pillowcase", "Quilt", "Throw Blanket",
                      "Mattress Protector", "Bed Skirt", "Sham Set", "Comforter", "Bedspread"],
            "descriptions": ["Soft and luxurious", "Comfortable sleep", "High-quality fabric",
                            "Beautiful patterns", "Durable and easy care"]
        },
        "Kitchen": {
            "names": ["Cookware Set", "Cutting Board", "Knife Set", "Bakeware", "Storage Containers",
                      "Utensil Set", "Colander", "Mixing Bowl", "Measuring Cups", "Food Storage Set"],
            "descriptions": ["Essential kitchen tools", "Durable and safe materials", "Easy to clean",
                            "Professional quality", "Versatile use"]
        },
        "Storage": {
            "names": ["Storage Bin", "Shelf", "Storage Baskets", "Closet Organizer", "Shoe Rack",
                      "Storage Box", "Drawer Organizer", "Hanging Shelf", "File Box", "Jewelry Organizer"],
            "descriptions": ["Keep things organized", "Space-saving design", "Durable construction",
                            "Versatile storage", "Neat and tidy"]
        },
        "Baby Room": {
            "names": ["Crib", "Changing Table", "Nursery Mobile", "Baby Monitor", "Rocking Chair",
                      "Diaper Pail", "Nursery Decor", "Baby Bookshelf", "Wardrobe", "Changing Pad"],
            "descriptions": ["Safe and stylish", "Perfect for nursery", "Quality construction",
                            "Baby-friendly design", "Essential furniture"]
        }
    }
}

class Command(BaseCommand):
    help = "Seed products for ALL categories (1000+ products)"

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing products before adding new ones',
        )
        parser.add_argument(
            '--count',
            type=int,
            default=1200,
            help='Number of products to create (default: 1200)',
        )

    def get_product_data(self, category_name, department_name):
        """Get product data from templates"""
        if department_name in PRODUCT_TEMPLATES:
            dept_data = PRODUCT_TEMPLATES[department_name]
            if category_name in dept_data:
                return dept_data[category_name]
        return None

    def generate_product_name(self, category_name, department_name):
        """Generate a realistic product name"""
        data = self.get_product_data(category_name, department_name)
        if data and data.get("names"):
            name = random.choice(data["names"])
            # Add variety with numbers or adjectives
            if random.random() < 0.3:
                adjectives = ["Premium", "Luxury", "Classic", "Modern", "Deluxe", "Essential", "Signature"]
                name = f"{random.choice(adjectives)} {name}"
            return name
        return f"{category_name} Product {random.randint(1000, 9999)}"

    def generate_description(self, category_name, department_name):
        """Generate a realistic product description"""
        data = self.get_product_data(category_name, department_name)
        if data and data.get("descriptions"):
            descs = data["descriptions"]
            # Combine 2-3 descriptions
            num_to_use = min(random.randint(2, 3), len(descs))
            selected = random.sample(descs, num_to_use)
            return " ".join(selected) + ". Available in multiple sizes and colors."
        return "Quality product. Great value. Satisfaction guaranteed."

    def generate_sku(self, department_name, category_name, index):
        """Generate unique SKU"""
        dept_prefix = department_name[:3].upper()
        cat_prefix = category_name[:3].upper()
        return f"{dept_prefix}{cat_prefix}{index:04d}"

    def handle(self, *args, **options):
        # Initialize Faker
        fake = Faker()
        
        # Clear existing products if requested
        if options.get('clear'):
            self.stdout.write("Clearing existing products...")
            Product.objects.all().delete()
            self.stdout.write("Products cleared.")

        # Get or create vendor
        user, created = User.objects.get_or_create(
            username="demo_vendor", 
            defaults={"email": "vendor@example.com", "role": "vendor"}
        )
        if created:
            user.set_password("demo1234")
            user.save()
        
        vendor, _ = Vendor.objects.get_or_create(
            user=user, 
            defaults={"store_name": "Demo Store", "slug": "demo-store", "status": "approved"}
        )

        # Get or create admin
        admin_user, created = User.objects.get_or_create(
            username="demo_admin", 
            defaults={
                "email": "admin@example.com", 
                "role": "admin", 
                "is_staff": True, 
                "is_superuser": True
            }
        )
        if created:
            admin_user.set_password("demo1234")
            admin_user.save()

        # Create default brand
        brand, _ = Brand.objects.get_or_create(name="House Brand")

        # Get ALL categories
        all_categories = Category.objects.all()

        if not all_categories:
            self.stdout.write(self.style.ERROR("No categories found. Please run the seed command first."))
            return

        total_products = options.get('count', 1200)
        products_created = 0
        category_product_count = {}

        self.stdout.write(f"Starting to create {total_products} products across all categories...")

        for i in range(total_products):
            # Select a random category
            category = random.choice(all_categories)
            category_name = category.name
            department_name = category.department.name
            
            # Generate product data
            name = self.generate_product_name(category_name, department_name)
            description = self.generate_description(category_name, department_name)
            
            # Generate realistic price based on category
            if department_name == "Beauty":
                price = random.randint(300, 3000)
            elif department_name == "Home & Lifestyle":
                price = random.randint(400, 8000)
            elif department_name == "Maternity":
                price = random.randint(500, 4000)
            elif department_name == "Kids":
                price = random.randint(200, 3000)
            else:  # Women
                price = random.randint(500, 5000)
            
            stock = random.randint(5, 100)
            status = random.choices(['active', 'inactive'], weights=[90, 10])[0]
            is_featured = random.choices([True, False], weights=[10, 90])[0]
            
            # Generate SKU
            sku = self.generate_sku(department_name, category_name, i + 1000)

            try:
                product = Product.objects.create(
                    vendor=vendor,
                    category=category,
                    brand=brand,
                    sku=sku,
                    name=name[:255],
                    description=description[:500],
                    price=price,
                    stock=stock,
                    status=status,
                    is_featured=is_featured,
                )
                products_created += 1
                
                # Track products per category
                category_key = f"{department_name} - {category_name}"
                category_product_count[category_key] = category_product_count.get(category_key, 0) + 1
                
                # Progress indicator
                if (i + 1) % 100 == 0:
                    self.stdout.write(f"Created {i + 1} products...")
                    
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Failed to create product {i+1}: {str(e)}"))
                continue

        # Summary statistics
        self.stdout.write(self.style.SUCCESS(
            f"Successfully created {products_created} products across all categories!"
        ))
        
        # Detailed summary by department
        self.stdout.write("\n" + "="*60)
        self.stdout.write("PRODUCT SUMMARY BY DEPARTMENT:")
        self.stdout.write("="*60)
        
        departments = Department.objects.all()
        for dept in departments:
            count = Product.objects.filter(category__department=dept).count()
            if count > 0:
                self.stdout.write(f"{dept.name}: {count} products")
                
                # Show top categories in this department
                categories = Category.objects.filter(department=dept)
                for cat in categories[:3]:  # Show top 3 categories
                    cat_count = Product.objects.filter(category=cat).count()
                    if cat_count > 0:
                        self.stdout.write(f"  - {cat.name}: {cat_count} products")
        
        self.stdout.write("="*60)
        self.stdout.write(f"""
        Credentials:
        - Vendor: {vendor.store_name}
          Username: demo_vendor / Password: demo1234
        - Admin: demo_admin / Password: demo1234
        
        API Endpoints:
        - Products: http://localhost:8000/api/catalog/products/
        - Categories: http://localhost:8000/api/catalog/categories/
        - Departments: http://localhost:8000/api/catalog/departments/
        """)