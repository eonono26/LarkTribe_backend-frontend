from django.db import models
from django.core.validators import FileExtensionValidator
from django.utils.text import slugify
from vendors.models import Vendor

class DepartmentMedia(models.Model):
    """Media files (images/videos) for departments"""
    class MediaType(models.TextChoices):
        IMAGE = 'image', 'Image'
        VIDEO = 'video', 'Video'
    
    department = models.ForeignKey('Department', on_delete=models.CASCADE, related_name="media_files")
    file = models.FileField(
        upload_to='departments/media/',
        validators=[FileExtensionValidator(['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'mp4', 'webm', 'mov'])]
    )
    media_type = models.CharField(max_length=10, choices=MediaType.choices, default=MediaType.IMAGE)
    alt_text = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order']
        verbose_name_plural = "Department media"
    
    def __str__(self):
        return f"{self.department.name} - {self.media_type}"


class Department(models.Model):
    """Top-level: Women, Kids, Beauty, Maternity, Home & Lifestyle"""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
        """Get the primary image for the department"""
        return self.media_files.filter(media_type='image', is_primary=True).first()
    
    @property
    def images(self):
        """Get all images for the department"""
        return self.media_files.filter(media_type='image')
    
    @property
    def videos(self):
        """Get all videos for the department"""
        return self.media_files.filter(media_type='video')


class CategoryMedia(models.Model):
    """Media files (images/videos) for categories"""
    class MediaType(models.TextChoices):
        IMAGE = 'image', 'Image'
        VIDEO = 'video', 'Video'
    
    category = models.ForeignKey('Category', on_delete=models.CASCADE, related_name="media_files")
    file = models.FileField(
        upload_to='categories/media/',
        validators=[FileExtensionValidator(['jpg', 'jpeg', 'png', 'webp', 'avif','gif','mp4', 'webm', 'mov'])]
    )
    media_type = models.CharField(max_length=10, choices=MediaType.choices, default=MediaType.IMAGE)
    alt_text = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order']
        verbose_name_plural = "Category media"
    
    def __str__(self):
        return f"{self.category.name} - {self.media_type}"


class Category(models.Model):
    """Sub-category, e.g. Dresses under Women, nested via parent for further depth."""
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="categories")
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True, related_name="children")
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]
        verbose_name_plural = "categories"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(f"{self.name}-{self.department.slug}")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.department.name} / {self.name}"
    
    @property
    def primary_image(self):
        """Get the primary image for the category"""
        return self.media_files.filter(media_type='image', is_primary=True).first()
    
    @property
    def images(self):
        """Get all images for the category"""
        return self.media_files.filter(media_type='image')
    
    @property
    def videos(self):
        """Get all videos for the category"""
        return self.media_files.filter(media_type='video')



class Brand(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Product(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING = "pending", "Pending Moderation"
        ACTIVE = "active", "Active"
        REJECTED = "rejected", "Rejected"

    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name="products")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name="products")
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    compare_at_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)
    sku = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    is_featured = models.BooleanField(default=False)
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    rating_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(f"{self.name}-{self.sku}")
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    @property
    def discount_percent(self):
        if self.compare_at_price and self.compare_at_price > self.price:
            return round((1 - self.price / self.compare_at_price) * 100)
        return 0


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="products/")
    alt_text = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]


class ProductVariant(models.Model):
    """e.g. size/colour combinations"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    size = models.CharField(max_length=20, blank=True)
    color = models.CharField(max_length=40, blank=True)
    stock = models.PositiveIntegerField(default=0)
    sku_suffix = models.CharField(max_length=32, blank=True)

    def __str__(self):
        return f"{self.product.name} - {self.size} {self.color}".strip()


class Review(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["product", "user"]
        ordering = ["-created_at"]


class Wishlist(models.Model):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="wishlist_items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["user", "product"]
        ordering = ["-created_at"]
