from django.db import models, transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.core.validators import FileExtensionValidator
from django.utils.text import slugify
from vendors.models import Vendor


# ============================================================
# DEPARTMENT MEDIA
# ============================================================

class DepartmentMedia(models.Model):
    """Media files (images/videos) for departments."""

    class MediaType(models.TextChoices):
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"

    department = models.ForeignKey(
        "Department",
        on_delete=models.CASCADE,
        related_name="media_files",
    )

    file = models.FileField(
        upload_to="departments/media/",
        validators=[
            FileExtensionValidator([
                "jpg", "jpeg", "png", "webp", "avif",
                "gif", "mp4", "webm", "mov",
            ])
        ],
    )

    media_type = models.CharField(
        max_length=10,
        choices=MediaType.choices,
        default=MediaType.IMAGE,
    )

    alt_text = models.CharField(
        max_length=200,
        blank=True,
    )

    is_primary = models.BooleanField(default=False)

    order = models.PositiveIntegerField(default=0)

    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]
        verbose_name_plural = "Department media"

    def __str__(self):
        return f"{self.department.name} - {self.media_type}"


# ============================================================
# DEPARTMENT
# ============================================================

class Department(models.Model):
    """
    Top-level shopping departments.

    Examples:
        Women
        Men
        Kids
        Beauty
        Maternity
        Home & Lifestyle
    """

    name = models.CharField(
        max_length=100,
        unique=True,
    )

    slug = models.SlugField(
        max_length=120,
        unique=True,
        blank=True,
    )

    order = models.PositiveIntegerField(
        default=0,
    )

    description = models.TextField(
        blank=True,
        null=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["order"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    @property
    def primary_image(self):
        return self.media_files.filter(
            media_type=DepartmentMedia.MediaType.IMAGE,
            is_primary=True,
        ).first()

    @property
    def images(self):
        return self.media_files.filter(
            media_type=DepartmentMedia.MediaType.IMAGE,
        )

    @property
    def videos(self):
        return self.media_files.filter(
            media_type=DepartmentMedia.MediaType.VIDEO,
        )


# ============================================================
# CATEGORY MEDIA
# ============================================================

class CategoryMedia(models.Model):
    """Media files (images/videos) for categories."""

    class MediaType(models.TextChoices):
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"

    category = models.ForeignKey(
        "Category",
        on_delete=models.CASCADE,
        related_name="media_files",
    )

    file = models.FileField(
        upload_to="categories/media/",
        validators=[
            FileExtensionValidator([
                "jpg", "jpeg", "png", "webp", "avif",
                "gif", "mp4", "webm", "mov",
            ])
        ],
    )

    media_type = models.CharField(
        max_length=10,
        choices=MediaType.choices,
        default=MediaType.IMAGE,
    )

    alt_text = models.CharField(
        max_length=200,
        blank=True,
    )

    is_primary = models.BooleanField(
        default=False,
    )

    order = models.PositiveIntegerField(
        default=0,
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["order"]
        verbose_name_plural = "Category media"

    def __str__(self):
        return f"{self.category.name} - {self.media_type}"


# ============================================================
# CATEGORY
# ============================================================

class Category(models.Model):
    """
    Product category hierarchy.

    IMPORTANT:
    Category is for the actual product type.

    Example:

        Kids
          └── Baby
                ├── Dresses
                ├── Tops
                ├── Rompers
                ├── Trousers
                └── Shoes

    Gender and age are NOT duplicated into category names.
    """

    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="categories",
    )

    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
    )

    name = models.CharField(
        max_length=100,
    )

    slug = models.SlugField(
        max_length=150,
        unique=True,
        blank=True,
    )

    order = models.PositiveIntegerField(
        default=0,
    )

    description = models.TextField(
        blank=True,
        null=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["order"]
        verbose_name_plural = "Categories"

        constraints = [
            models.UniqueConstraint(
                fields=["department", "parent", "name"],
                name="unique_category_per_parent",
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            parts = [self.department.slug]

            if self.parent:
                parts.append(self.parent.slug)

            parts.append(slugify(self.name))

            self.slug = "-".join(parts)

        super().save(*args, **kwargs)

    def __str__(self):
        if self.parent:
            return f"{self.department.name} / {self.parent.name} / {self.name}"

        return f"{self.department.name} / {self.name}"

    @property
    def primary_image(self):
        return self.media_files.filter(
            media_type=CategoryMedia.MediaType.IMAGE,
            is_primary=True,
        ).first()

    @property
    def images(self):
        return self.media_files.filter(
            media_type=CategoryMedia.MediaType.IMAGE,
        )

    @property
    def videos(self):
        return self.media_files.filter(
            media_type=CategoryMedia.MediaType.VIDEO,
        )


# ============================================================
# AGE GROUP MEDIA
# ============================================================

class AgeGroupMedia(models.Model):
    """Media files (images/videos) for age groups."""

    class MediaType(models.TextChoices):
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"

    age_group = models.ForeignKey(
        "AgeGroup",
        on_delete=models.CASCADE,
        related_name="media_files",
    )

    file = models.FileField(
        upload_to="agegroups/media/",
        validators=[
            FileExtensionValidator([
                "jpg", "jpeg", "png", "webp", "avif",
                "gif", "mp4", "webm", "mov",
            ])
        ],
    )

    media_type = models.CharField(
        max_length=10,
        choices=MediaType.choices,
        default=MediaType.IMAGE,
    )

    alt_text = models.CharField(
        max_length=200,
        blank=True,
    )

    is_primary = models.BooleanField(
        default=False,
    )

    order = models.PositiveIntegerField(
        default=0,
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["order"]
        verbose_name_plural = "Age group media"

    def __str__(self):
        return f"{self.age_group.name} - {self.media_type}"


# ============================================================
# AGE GROUP
# ============================================================

class AgeGroup(models.Model):
    """
    Age-only shopping segment.

    Gender MUST NOT be stored here.

    Examples:

        0–3 Months
        3–6 Months
        6–12 Months
        12–24 Months
        2–4 Years
        5–7 Years
        8–12 Years
        13–15 Years
        16–18 Years
    """

    class Stage(models.TextChoices):
        BABY = "baby", "Baby"
        KIDS = "kids", "Kids"
        TEENS = "teens", "Teens"

    name = models.CharField(
        max_length=50,
        unique=True,
    )

    slug = models.SlugField(
        max_length=60,
        unique=True,
        blank=True,
    )

    stage = models.CharField(
        max_length=20,
        choices=Stage.choices,
        default=Stage.BABY,
        db_index=True,
        help_text="General age stage: Baby, Kids or Teens.",
    )

    min_age_years = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        help_text="Lower age boundary in years.",
    )

    max_age_years = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Upper age boundary in years. Leave blank for no upper limit.",
    )

    icon = models.CharField(
        max_length=8,
        blank=True,
        help_text="Emoji shown in age-group navigation.",
    )

    order = models.PositiveIntegerField(
        default=0,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["stage", "order"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    @property
    def primary_image(self):
        return self.media_files.filter(
            media_type=AgeGroupMedia.MediaType.IMAGE,
            is_primary=True,
        ).first()

    @property
    def images(self):
        return self.media_files.filter(
            media_type=AgeGroupMedia.MediaType.IMAGE,
        )

    @property
    def videos(self):
        return self.media_files.filter(
            media_type=AgeGroupMedia.MediaType.VIDEO,
        )


# ============================================================
# BRAND MEDIA
# ============================================================

class BrandMedia(models.Model):
    """Media files (images/videos) for brands."""

    class MediaType(models.TextChoices):
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"

    brand = models.ForeignKey(
        "Brand",
        on_delete=models.CASCADE,
        related_name="media_files",
    )

    file = models.FileField(
        upload_to="brands/media/",
        validators=[
            FileExtensionValidator([
                "jpg", "jpeg", "png", "webp", "avif",
                "gif", "mp4", "webm", "mov",
            ])
        ],
    )

    media_type = models.CharField(
        max_length=10,
        choices=MediaType.choices,
        default=MediaType.IMAGE,
    )

    alt_text = models.CharField(
        max_length=200,
        blank=True,
    )

    is_primary = models.BooleanField(
        default=False,
    )

    order = models.PositiveIntegerField(
        default=0,
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["order"]
        verbose_name_plural = "Brand media"

    def __str__(self):
        return f"{self.brand.name} - {self.media_type}"


# ============================================================
# BRAND
# ============================================================

class Brand(models.Model):

    name = models.CharField(
        max_length=100,
        unique=True,
    )

    slug = models.SlugField(
        max_length=120,
        unique=True,
        blank=True,
    )

    logo = models.ImageField(
        upload_to="brands/logos/",
        blank=True,
        null=True,
    )

    description = models.TextField(
        blank=True,
        null=True,
    )

    website = models.URLField(
        blank=True,
        null=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    @property
    def primary_image(self):
        return self.media_files.filter(
            media_type=BrandMedia.MediaType.IMAGE,
            is_primary=True,
        ).first()

    @property
    def images(self):
        return self.media_files.filter(
            media_type=BrandMedia.MediaType.IMAGE,
        )

    @property
    def videos(self):
        return self.media_files.filter(
            media_type=BrandMedia.MediaType.VIDEO,
        )


# ============================================================
# PRODUCT
# ============================================================

# ============================================================
# SIZE GUIDE
# ============================================================

class SizeGuide(models.Model):
    """
    Admin-managed size chart (shoes, clothes, etc.) that can be attached
    to any Product so the frontend can show a "Size guide" table next to
    the size selector on the product page.
    """

    class GuideType(models.TextChoices):
        CLOTHES = "clothes", "Clothes"
        SHOES = "shoes", "Shoes"
        KIDS = "kids", "Kids / Baby"
        ACCESSORIES = "accessories", "Accessories"
        OTHER = "other", "Other"

    name = models.CharField(
        max_length=120,
        help_text="Internal label, e.g. 'Women's Shoes (EU)' or 'Kids Tops'.",
    )

    guide_type = models.CharField(
        max_length=20,
        choices=GuideType.choices,
        default=GuideType.CLOTHES,
        db_index=True,
    )

    columns = models.JSONField(
        default=list,
        blank=True,
        help_text="Column headers, e.g. [\"Size\", \"EU\", \"UK\", \"US\", \"Foot length (cm)\"].",
    )

    rows = models.JSONField(
        default=list,
        blank=True,
        help_text="Row data — a list of lists, each matching the order of 'columns'.",
    )

    notes = models.TextField(
        blank=True,
        help_text="How-to-measure tips or fit notes shown below the table.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.get_guide_type_display()})"


class Product(models.Model):

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING = "pending", "Pending Moderation"
        ACTIVE = "active", "Active"
        REJECTED = "rejected", "Rejected"

    class Gender(models.TextChoices):
        GIRLS = "girls", "Girls"
        BOYS = "boys", "Boys"
        UNISEX = "unisex", "Unisex"

    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.CASCADE,
        related_name="products",
    )

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
    )

    brand = models.ForeignKey(
        Brand,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )

    # --------------------------------------------------------
    # AGE
    # --------------------------------------------------------
    age_groups = models.ManyToManyField(
        AgeGroup,
        blank=True,
        related_name="products",
        help_text=(
            "Age ranges this product is suitable for. "
            "Example: 6–12 Months, 12–24 Months."
        ),
    )

    # --------------------------------------------------------
    # GENDER
    # --------------------------------------------------------
    gender = models.CharField(
        max_length=10,
        choices=Gender.choices,
        default=Gender.UNISEX,
        db_index=True,
        help_text=(
            "Girls / Boys / Unisex. "
            "Used by the Baby Boys / Baby Girls navigation."
        ),
    )

    # --------------------------------------------------------
    # PRODUCT INFORMATION
    # --------------------------------------------------------
    name = models.CharField(
        max_length=200,
    )

    slug = models.SlugField(
        max_length=220,
        unique=True,
        blank=True,
    )

    description = models.TextField(
        blank=True,
    )

    features = models.JSONField(
        default=list,
        blank=True,
        help_text=(
            "Short bullet-point features shown on the product page below "
            "the description, e.g. [\"100% cotton\", \"Machine washable\", "
            "\"Reinforced knees\"]."
        ),
    )

    materials = models.CharField(
        max_length=255,
        blank=True,
        help_text=(
            "Material composition shown under 'Materials & Care' on the "
            "product page, e.g. 'Nylon, Rubber' or '100% Organic Cotton'."
        ),
    )

    care_instructions = models.TextField(
        blank=True,
        help_text="Optional care/washing instructions shown under Materials & Care.",
    )

    size_guide = models.ForeignKey(
        "SizeGuide",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
        help_text="Size guide table shown next to the size selector for this product.",
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    compare_at_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    stock = models.PositiveIntegerField(
        default=0,
    )

    sku = models.CharField(
        max_length=64,
        unique=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    is_featured = models.BooleanField(
        default=False,
    )

    rating_avg = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0,
    )

    rating_count = models.PositiveIntegerField(
        default=0,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["category", "gender", "status"],
                name="product_category_gender_idx",
            ),
            models.Index(
                fields=["gender", "status"],
                name="product_gender_status_idx",
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(
                f"{self.name}-{self.sku}"
            )

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    @property
    def discount_percent(self):
        if (
            self.compare_at_price
            and self.compare_at_price > self.price
        ):
            return round(
                (1 - self.price / self.compare_at_price) * 100
            )

        return 0


# ============================================================
# PRODUCT IMAGE
# ============================================================


class ProductImage(models.Model):
    """
    One photo of a product.

    Photos are grouped per color (``color`` matches ``ProductVariant.color``;
    blank = a general shot not tied to a color). Inside a color group each
    photo records which angle it shows (``view``), where it sits in that
    color's gallery (``order``, lowest first) and whether it is the color's
    primary photo (``is_primary`` - at most one per product + color, enforced
    both here and by a database constraint).
    """

    class View(models.TextChoices):
        FRONT = "front", "Front"
        BACK = "back", "Back"
        SIDE = "side", "Side"
        DETAIL = "detail", "Detail"
        OTHER = "other", "Other"

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="products/")
    alt_text = models.CharField(max_length=200, blank=True)
    color = models.CharField(
        max_length=40,
        blank=True,
        help_text="Which color variant this photo shows, e.g. 'Black'. Leave blank for a general/default shot.",
    )
    view = models.CharField(
        max_length=10,
        choices=View.choices,
        default=View.FRONT,
        help_text="Angle shown: front, back, side, detail or other.",
    )
    is_primary = models.BooleanField(
        default=False,
        help_text="The lead photo for this color (shown first). Only one per color.",
    )
    order = models.PositiveIntegerField(
        default=0,
        help_text="Position inside this color's gallery - lowest first.",
    )

    class Meta:
        ordering = ["-is_primary", "order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "color"],
                condition=models.Q(is_primary=True),
                name="one_primary_image_per_product_color",
            ),
        ]

    def __str__(self):
        label = f"{self.color} " if self.color else ""
        return f"{self.product.name} - {label}{self.get_view_display()} ({self.order})"

    # --- primary bookkeeping -------------------------------------------------

    @classmethod
    def group(cls, product_id, color):
        """All photos of one product + color (color compared case-insensitively)."""
        return cls.objects.filter(product_id=product_id, color__iexact=(color or "").strip())

    @classmethod
    def set_primary(cls, image):
        """Make `image` the primary of its color and move it to the front of that
        color's gallery (other colors are untouched)."""
        with transaction.atomic():
            others = list(
                cls.group(image.product_id, image.color)
                .exclude(pk=image.pk)
                .order_by("order", "id")
            )
            image.is_primary = True
            image.order = 0
            image.save()  # demotes the previous primary
            for n, other in enumerate(others, start=1):
                if other.order != n:
                    other.order = n
                    cls.objects.filter(pk=other.pk).update(order=n)

    @classmethod
    def ensure_primary(cls, product_id, color):
        """If a non-empty color group has no primary photo, promote its first one."""
        siblings = cls.group(product_id, color)
        if siblings.exists() and not siblings.filter(is_primary=True).exists():
            first = siblings.order_by("order", "id").first()
            cls.objects.filter(pk=first.pk).update(is_primary=True)

    def save(self, *args, **kwargs):
        self.color = (self.color or "").strip()
        update_fields = kwargs.get("update_fields")

        with transaction.atomic():
            old_color = None
            if self.pk:
                old_color = (
                    ProductImage.objects.filter(pk=self.pk)
                    .values_list("color", flat=True)
                    .first()
                )

            siblings = self.group(self.product_id, self.color).exclude(pk=self.pk)

            if self.is_primary:
                siblings.filter(is_primary=True).update(is_primary=False)
            elif update_fields is None and not siblings.filter(is_primary=True).exists():
                # The first photo of a color becomes its primary automatically.
                self.is_primary = True

            super().save(*args, **kwargs)

            # Moved to another color: the color it left must not lose its primary.
            if old_color is not None and old_color.lower() != self.color.lower():
                self.ensure_primary(self.product_id, old_color)


@receiver(post_delete, sender=ProductImage)
def _promote_primary_after_delete(sender, instance, **kwargs):
    ProductImage.ensure_primary(instance.product_id, instance.color)


# ============================================================
# PRODUCT VARIANT
# ============================================================

class ProductVariant(models.Model):
    """Size/colour combinations for a product."""

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="variants",
    )

    size = models.CharField(
        max_length=20,
        blank=True,
    )

    color = models.CharField(
        max_length=40,
        blank=True,
    )

    stock = models.PositiveIntegerField(
        default=0,
    )

    sku_suffix = models.CharField(
        max_length=32,
        blank=True,
    )

    def __str__(self):
        return (
            f"{self.product.name} - "
            f"{self.size} {self.color}"
        ).strip()


# ============================================================
# REVIEW
# ============================================================

class Review(models.Model):

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="reviews",
    )

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="reviews",
    )

    rating = models.PositiveSmallIntegerField()

    comment = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        unique_together = ["product", "user"]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.product.name} - {self.rating}/5"


# ============================================================
# WISHLIST
# ============================================================

class Wishlist(models.Model):

    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="wishlist_items",
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        unique_together = ["user", "product"]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} - {self.product.name}"
