from django_filters import rest_framework as filters
from django.db.models import F, Q
from .models import Product, Category, Brand, Department


class ProductFilter(filters.FilterSet):
    """
    Advanced product filtering with price ranges, categories, brands, and more
    """
    # Price range filters
    price_min = filters.NumberFilter(field_name="price", lookup_expr='gte')
    price_max = filters.NumberFilter(field_name="price", lookup_expr='lte')
    
    # Rating filters
    rating_min = filters.NumberFilter(field_name="rating_avg", lookup_expr='gte')
    rating_max = filters.NumberFilter(field_name="rating_avg", lookup_expr='lte')
    
    # Stock filters
    in_stock = filters.BooleanFilter(method='filter_in_stock')
    low_stock = filters.BooleanFilter(method='filter_low_stock')
    
    # Date filters
    created_after = filters.DateTimeFilter(field_name="created_at", lookup_expr='gte')
    created_before = filters.DateTimeFilter(field_name="created_at", lookup_expr='lte')
    
    # Search filter for multiple fields
    q = filters.CharFilter(method='filter_search')
    
    # Category with nested support
    category = filters.CharFilter(field_name="category__slug")
    department = filters.CharFilter(field_name="category__department__slug")
    
    # Brand filter
    brand = filters.CharFilter(field_name="brand__slug")

    # Age group filter — shopping by Kids/Teens/Baby etc, independent of department
    age_group = filters.CharFilter(method='filter_age_group')
    
    # Discount filter
    on_sale = filters.BooleanFilter(method='filter_on_sale')
    
    # Featured filter
    is_featured = filters.BooleanFilter(field_name="is_featured")
    
    # Multiple category IDs
    categories = filters.BaseInFilter(field_name="category__id", lookup_expr='in')
    
    # Price range with custom lookup
    price_range = filters.CharFilter(method='filter_price_range')
    
    class Meta:
        model = Product
        fields = [
            'category', 'categories', 'department', 'brand', 'age_group',
            'price_min', 'price_max', 'rating_min', 'rating_max',
            'in_stock', 'low_stock', 'on_sale', 'is_featured',
            'created_after', 'created_before', 'q'
        ]
    
    def filter_in_stock(self, queryset, name, value):
        """Filter products that are in stock (stock > 0)"""
        if value:
            return queryset.filter(stock__gt=0)
        return queryset
    
    def filter_low_stock(self, queryset, name, value):
        """Filter products with low stock (stock < 10)"""
        if value:
            return queryset.filter(stock__lt=10, stock__gt=0)
        return queryset
    
    def filter_search(self, queryset, name, value):
        """Advanced search across multiple fields"""
        if value:
            return queryset.filter(
                Q(name__icontains=value) |
                Q(description__icontains=value) |
                Q(brand__name__icontains=value) |
                Q(category__name__icontains=value) |
                Q(sku__icontains=value)
            )
        return queryset
    
    def filter_on_sale(self, queryset, name, value):
        """Filter products with discount (compare_at_price > price)"""
        if value:
            return queryset.exclude(compare_at_price__isnull=True).exclude(compare_at_price__lte=F('price'))
        return queryset
    
    def filter_price_range(self, queryset, name, value):
        """Filter by price range like '100-500'"""
        try:
            min_price, max_price = value.split('-')
            if min_price:
                queryset = queryset.filter(price__gte=float(min_price))
            if max_price:
                queryset = queryset.filter(price__lte=float(max_price))
        except (ValueError, TypeError):
            pass
        return queryset

    def filter_age_group(self, queryset, name, value):
        """Filter products tagged for a given age group slug, e.g. 'kids'."""
        if value:
            return queryset.filter(age_groups__slug=value).distinct()
        return queryset


class CategoryFilter(filters.FilterSet):
    """Filter for categories"""
    department = filters.CharFilter(field_name="department__slug")
    parent = filters.NumberFilter(field_name="parent__id")
    has_products = filters.BooleanFilter(method='filter_has_products')
    
    class Meta:
        model = Category
        fields = ['department', 'parent', 'has_products']
    
    def filter_has_products(self, queryset, name, value):
        """Filter categories that have products"""
        if value:
            return queryset.filter(products__isnull=False).distinct()
        return queryset


class BrandFilter(filters.FilterSet):
    """Filter for brands"""
    has_products = filters.BooleanFilter(method='filter_has_products')
    category = filters.CharFilter(method='filter_by_category')
    
    class Meta:
        model = Brand
        fields = ['has_products']
    
    def filter_has_products(self, queryset, name, value):
        """Filter brands that have products"""
        if value:
            return queryset.filter(products__isnull=False).distinct()
        return queryset
    
    def filter_by_category(self, queryset, name, value):
        """Filter brands by category"""
        if value:
            return queryset.filter(products__category__slug=value).distinct()
        return queryset


class DepartmentFilter(filters.FilterSet):
    """Filter for departments"""
    has_products = filters.BooleanFilter(method='filter_has_products')
    has_categories = filters.BooleanFilter(method='filter_has_categories')
    
    class Meta:
        model = Department
        fields = ['has_products', 'has_categories']
    
    def filter_has_products(self, queryset, name, value):
        """Filter departments that have products"""
        if value:
            return queryset.filter(categories__products__isnull=False).distinct()
        return queryset
    
    def filter_has_categories(self, queryset, name, value):
        """Filter departments that have categories"""
        if value:
            return queryset.filter(categories__isnull=False).distinct()
        return queryset