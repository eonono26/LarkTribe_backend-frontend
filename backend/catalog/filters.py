from django_filters import rest_framework as filters
from django.db.models import F, Q, ExpressionWrapper, FloatField

from .models import (
    Product,
    Category,
    Brand,
    Department,
    AgeGroup,
)
from .utils import category_subtree_ids


# ============================================================
# PRODUCT FILTER
# ============================================================

class ProductFilter(filters.FilterSet):
    """
    Advanced product filtering.

    Supports the complete shopping flow:

        Kids
          ↓
        Baby
          ↓
        Boys / Girls
          ↓
        Age Group
          ↓
        Product Category
          ↓
        Products

    Examples:

        ?department=kids

        ?category=dresses

        ?gender=girls

        ?age=6-12-months

        ?gender=girls&age=6-12-months

        ?gender=girls&age=6-12-months&category=dresses

        ?department=kids&gender=girls&age=6-12-months&category=dresses
    """

    # --------------------------------------------------------
    # PRICE
    # --------------------------------------------------------

    price_min = filters.NumberFilter(
        field_name="price",
        lookup_expr="gte",
    )

    price_max = filters.NumberFilter(
        field_name="price",
        lookup_expr="lte",
    )

    # --------------------------------------------------------
    # RATING
    # --------------------------------------------------------

    rating_min = filters.NumberFilter(
        field_name="rating_avg",
        lookup_expr="gte",
    )

    rating_max = filters.NumberFilter(
        field_name="rating_avg",
        lookup_expr="lte",
    )

    # --------------------------------------------------------
    # STOCK
    # --------------------------------------------------------

    in_stock = filters.BooleanFilter(
        method="filter_in_stock"
    )

    low_stock = filters.BooleanFilter(
        method="filter_low_stock"
    )

    # --------------------------------------------------------
    # DATE
    # --------------------------------------------------------

    created_after = filters.DateTimeFilter(
        field_name="created_at",
        lookup_expr="gte",
    )

    created_before = filters.DateTimeFilter(
        field_name="created_at",
        lookup_expr="lte",
    )

    # --------------------------------------------------------
    # SEARCH
    # --------------------------------------------------------

    q = filters.CharFilter(
        method="filter_search"
    )

    # --------------------------------------------------------
    # CATEGORY
    # --------------------------------------------------------

    # Matches the category AND everything nested under it, so a parent such
    # as "Clothing" lists all of its Shorts / Jeans / T-Shirts, while a leaf
    # such as "Shorts" lists only shorts.
    category = filters.CharFilter(
        method="filter_category"
    )

    categories = filters.BaseInFilter(
        field_name="category__id",
        lookup_expr="in",
    )

    # --------------------------------------------------------
    # DEPARTMENT
    # --------------------------------------------------------

    department = filters.CharFilter(
        field_name="category__department__slug"
    )

    # --------------------------------------------------------
    # BRAND
    # --------------------------------------------------------

    brand = filters.CharFilter(
        field_name="brand__slug"
    )

    # --------------------------------------------------------
    # GENDER
    # --------------------------------------------------------

    gender = filters.CharFilter(
        method="filter_gender"
    )

    # --------------------------------------------------------
    # AGE
    # --------------------------------------------------------

    # Preferred frontend parameter:
    #
    # ?age=6-12-months
    #
    age = filters.CharFilter(
        method="filter_age"
    )

    # Backward-compatible parameter:
    #
    # ?age_group=6-12-months
    age_group = filters.CharFilter(
        method="filter_age_group"
    )

    # Optional numeric age-group ID
    #
    # ?age_id=3
    age_id = filters.NumberFilter(
        method="filter_age_id"
    )

    # --------------------------------------------------------
    # STAGE
    # --------------------------------------------------------

    # Life stage, independent of any single age group.
    # Used by the top nav (Baby / Kids / Teens) so "Shop all Baby"
    # works without picking one specific age range.
    #
    # ?stage=baby
    stage = filters.CharFilter(
        method="filter_stage"
    )

    # --------------------------------------------------------
    # SIZE
    # --------------------------------------------------------

    size = filters.CharFilter(
        method="filter_size"
    )

    # --------------------------------------------------------
    # DISCOUNT
    # --------------------------------------------------------

    min_discount = filters.NumberFilter(
        method="filter_min_discount"
    )

    on_sale = filters.BooleanFilter(
        method="filter_on_sale"
    )

    # --------------------------------------------------------
    # FEATURED
    # --------------------------------------------------------

    is_featured = filters.BooleanFilter(
        field_name="is_featured"
    )

    # --------------------------------------------------------
    # PRICE RANGE
    # --------------------------------------------------------

    price_range = filters.CharFilter(
        method="filter_price_range"
    )

    class Meta:
        model = Product

        fields = [
            # Category
            "category",
            "categories",

            # Department
            "department",

            # Brand
            "brand",

            # Gender
            "gender",

            # Age
            "age",
            "age_group",
            "age_id",
            "stage",

            # Size
            "size",

            # Price
            "price_min",
            "price_max",
            "price_range",

            # Rating
            "rating_min",
            "rating_max",

            # Stock
            "in_stock",
            "low_stock",

            # Discount
            "on_sale",
            "min_discount",

            # Other
            "is_featured",
            "created_after",
            "created_before",
            "q",
        ]

    # ========================================================
    # CATEGORY (includes descendants)
    # ========================================================

    def filter_category(
        self,
        queryset,
        name,
        value,
    ):
        if not value:
            return queryset

        return queryset.filter(
            category_id__in=category_subtree_ids(value.strip())
        )

    # ========================================================
    # STOCK
    # ========================================================

    def filter_in_stock(
        self,
        queryset,
        name,
        value,
    ):
        if value:
            return queryset.filter(
                stock__gt=0
            )

        return queryset

    def filter_low_stock(
        self,
        queryset,
        name,
        value,
    ):
        if value:
            return queryset.filter(
                stock__gt=0,
                stock__lt=10,
            )

        return queryset

    # ========================================================
    # SEARCH
    # ========================================================

    def filter_search(
        self,
        queryset,
        name,
        value,
    ):
        if not value:
            return queryset

        return queryset.filter(
            Q(name__icontains=value)
            | Q(description__icontains=value)
            | Q(brand__name__icontains=value)
            | Q(category__name__icontains=value)
            | Q(sku__icontains=value)
        ).distinct()

    # ========================================================
    # GENDER
    # ========================================================

    def filter_gender(
        self,
        queryset,
        name,
        value,
    ):
        """
        Filter by product gender.

        Examples:

            ?gender=girls
            ?gender=boys
            ?gender=unisex
        """

        if not value:
            return queryset

        value = value.strip().lower()

        valid_genders = {
            choice[0]
            for choice in Product.Gender.choices
        }

        if value not in valid_genders:
            return queryset.none()

        return queryset.filter(
            gender=value
        )

    # ========================================================
    # AGE
    # ========================================================

    def filter_age(
        self,
        queryset,
        name,
        value,
    ):
        """
        Preferred age filter.

        Example:

            ?age=6-12-months

        Product must be associated with the
        requested AgeGroup.
        """

        if not value:
            return queryset

        return queryset.filter(
            age_groups__slug=value.strip()
        ).distinct()

    # ========================================================
    # AGE GROUP ALIAS
    # ========================================================

    def filter_age_group(
        self,
        queryset,
        name,
        value,
    ):
        """
        Backward-compatible alias for age.

        Example:

            ?age_group=6-12-months
        """

        if not value:
            return queryset

        return queryset.filter(
            age_groups__slug=value.strip()
        ).distinct()

    # ========================================================
    # AGE ID
    # ========================================================

    def filter_age_id(
        self,
        queryset,
        name,
        value,
    ):
        """
        Filter using AgeGroup primary key.

        Example:

            ?age_id=3
        """

        if not value:
            return queryset

        return queryset.filter(
            age_groups__id=value
        ).distinct()

    # ========================================================
    # STAGE
    # ========================================================

    def filter_stage(
        self,
        queryset,
        name,
        value,
    ):
        """
        Filter by life stage (Baby / Kids / Teens), independent
        of any single age group.

        Example:

            ?stage=baby
        """

        if not value:
            return queryset

        value = value.strip().lower()

        valid_stages = {
            choice[0]
            for choice in AgeGroup.Stage.choices
        }

        if value not in valid_stages:
            return queryset.none()

        return queryset.filter(
            age_groups__stage=value
        ).distinct()

    # ========================================================
    # SIZE
    # ========================================================

    def filter_size(
        self,
        queryset,
        name,
        value,
    ):
        """
        Match product variant size.

        Examples:

            ?size=4T
            ?size=M
            ?size=6-8 Yrs
        """

        if not value:
            return queryset

        return queryset.filter(
            variants__size__iexact=value.strip()
        ).distinct()

    # ========================================================
    # ON SALE
    # ========================================================

    def filter_on_sale(
        self,
        queryset,
        name,
        value,
    ):
        if value:
            return (
                queryset
                .exclude(
                    compare_at_price__isnull=True
                )
                .exclude(
                    compare_at_price__lte=F(
                        "price"
                    )
                )
            )

        return queryset

    # ========================================================
    # PRICE RANGE
    # ========================================================

    def filter_price_range(
        self,
        queryset,
        name,
        value,
    ):
        """
        Supports:

            ?price_range=100-500
        """

        if not value:
            return queryset

        try:
            parts = value.split("-", 1)

            min_price = parts[0].strip()
            max_price = (
                parts[1].strip()
                if len(parts) > 1
                else ""
            )

            if min_price:
                queryset = queryset.filter(
                    price__gte=float(min_price)
                )

            if max_price:
                queryset = queryset.filter(
                    price__lte=float(max_price)
                )

        except (
            ValueError,
            TypeError,
        ):
            pass

        return queryset

    # ========================================================
    # MINIMUM DISCOUNT
    # ========================================================

    def filter_min_discount(
        self,
        queryset,
        name,
        value,
    ):
        """
        Example:

            ?min_discount=50

        Returns products with at least
        50% discount.
        """

        if value in (
            None,
            "",
        ):
            return queryset

        try:
            value = float(value)
        except (
            ValueError,
            TypeError,
        ):
            return queryset

        annotated = (
            queryset
            .exclude(
                compare_at_price__isnull=True
            )
            .exclude(
                compare_at_price__lte=F(
                    "price"
                )
            )
            .annotate(
                _discount_pct=ExpressionWrapper(
                    (
                        1
                        - F("price")
                        / F("compare_at_price")
                    )
                    * 100.0,
                    output_field=FloatField(),
                )
            )
        )

        return annotated.filter(
            _discount_pct__gte=value
        )


# ============================================================
# CATEGORY FILTER
# ============================================================

class CategoryFilter(filters.FilterSet):
    """
    Category filtering.

    Supports:

        ?department=kids
        ?department__slug=kids

        ?parent=12

        ?gender=girls

        ?age=6-12-months

        ?age_group=6-12-months
    """

    # --------------------------------------------------------
    # DEPARTMENT
    # --------------------------------------------------------

    department = filters.CharFilter(
        field_name="department__slug"
    )

    # Backward-compatible frontend parameter
    department__slug = filters.CharFilter(
        field_name="department__slug"
    )

    # --------------------------------------------------------
    # PARENT CATEGORY
    # --------------------------------------------------------

    parent = filters.NumberFilter(
        field_name="parent__id"
    )

    # --------------------------------------------------------
    # HAS PRODUCTS
    # --------------------------------------------------------

    has_products = filters.BooleanFilter(
        method="filter_has_products"
    )

    # --------------------------------------------------------
    # GENDER
    # --------------------------------------------------------

    gender = filters.CharFilter(
        method="filter_gender"
    )

    # --------------------------------------------------------
    # AGE
    # --------------------------------------------------------

    age = filters.CharFilter(
        method="filter_age"
    )

    # Backward-compatible
    age_group = filters.CharFilter(
        method="filter_age_group"
    )

    # Life stage (Baby / Kids / Teens)
    stage = filters.CharFilter(
        method="filter_stage"
    )

    class Meta:
        model = Category

        fields = [
            "department",
            "department__slug",
            "parent",
            "has_products",
            "gender",
            "age",
            "age_group",
            "stage",
        ]

    # ========================================================
    # HAS PRODUCTS
    # ========================================================

    def filter_has_products(
        self,
        queryset,
        name,
        value,
    ):
        if value:
            return queryset.filter(
                products__status=Product.Status.ACTIVE
            ).distinct()

        return queryset

    # ========================================================
    # GENDER
    # ========================================================

    def filter_gender(
        self,
        queryset,
        name,
        value,
    ):
        """
        Only show categories that contain
        active products for the selected gender.

        Example:

            ?gender=girls
        """

        if not value:
            return queryset

        value = value.strip().lower()

        valid_genders = {
            choice[0]
            for choice in Product.Gender.choices
        }

        if value not in valid_genders:
            return queryset.none()

        return queryset.filter(
            products__gender=value,
            products__status=Product.Status.ACTIVE,
        ).distinct()

    # ========================================================
    # AGE
    # ========================================================

    def filter_age(
        self,
        queryset,
        name,
        value,
    ):
        """
        Only show categories containing products
        for the selected age group.

        Example:

            ?age=6-12-months
        """

        if not value:
            return queryset

        return queryset.filter(
            products__age_groups__slug=value.strip(),
            products__status=Product.Status.ACTIVE,
        ).distinct()

    # ========================================================
    # AGE GROUP ALIAS
    # ========================================================

    def filter_age_group(
        self,
        queryset,
        name,
        value,
    ):
        if not value:
            return queryset

        return queryset.filter(
            products__age_groups__slug=value.strip(),
            products__status=Product.Status.ACTIVE,
        ).distinct()

    # ========================================================
    # STAGE
    # ========================================================

    def filter_stage(
        self,
        queryset,
        name,
        value,
    ):
        """
        Only show categories containing active products
        for the selected life stage.

        Example:

            ?stage=baby
        """

        if not value:
            return queryset

        value = value.strip().lower()

        valid_stages = {
            choice[0]
            for choice in AgeGroup.Stage.choices
        }

        if value not in valid_stages:
            return queryset.none()

        return queryset.filter(
            products__age_groups__stage=value,
            products__status=Product.Status.ACTIVE,
        ).distinct()


# ============================================================
# BRAND FILTER
# ============================================================

class BrandFilter(filters.FilterSet):
    """
    Brand filtering.

    Supports gender and age context so the frontend
    doesn't show irrelevant brands.
    """

    has_products = filters.BooleanFilter(
        method="filter_has_products"
    )

    category = filters.CharFilter(
        method="filter_by_category"
    )

    gender = filters.CharFilter(
        method="filter_gender"
    )

    age = filters.CharFilter(
        method="filter_age"
    )

    age_group = filters.CharFilter(
        method="filter_age_group"
    )

    stage = filters.CharFilter(
        method="filter_stage"
    )

    class Meta:
        model = Brand

        fields = [
            "name",
            "has_products",
            "category",
            "gender",
            "age",
            "age_group",
            "stage",
        ]

    # ========================================================
    # HAS PRODUCTS
    # ========================================================

    def filter_has_products(
        self,
        queryset,
        name,
        value,
    ):
        if value:
            return queryset.filter(
                products__status=Product.Status.ACTIVE
            ).distinct()

        return queryset

    # ========================================================
    # CATEGORY
    # ========================================================

    def filter_by_category(
        self,
        queryset,
        name,
        value,
    ):
        if not value:
            return queryset

        return queryset.filter(
            products__category__slug=value,
            products__status=Product.Status.ACTIVE,
        ).distinct()

    # ========================================================
    # GENDER
    # ========================================================

    def filter_gender(
        self,
        queryset,
        name,
        value,
    ):
        if not value:
            return queryset

        value = value.strip().lower()

        valid_genders = {
            choice[0]
            for choice in Product.Gender.choices
        }

        if value not in valid_genders:
            return queryset.none()

        return queryset.filter(
            products__gender=value,
            products__status=Product.Status.ACTIVE,
        ).distinct()

    # ========================================================
    # AGE
    # ========================================================

    def filter_age(
        self,
        queryset,
        name,
        value,
    ):
        if not value:
            return queryset

        return queryset.filter(
            products__age_groups__slug=value.strip(),
            products__status=Product.Status.ACTIVE,
        ).distinct()

    # ========================================================
    # AGE GROUP ALIAS
    # ========================================================

    def filter_age_group(
        self,
        queryset,
        name,
        value,
    ):
        if not value:
            return queryset

        return queryset.filter(
            products__age_groups__slug=value.strip(),
            products__status=Product.Status.ACTIVE,
        ).distinct()

    # ========================================================
    # STAGE
    # ========================================================

    def filter_stage(
        self,
        queryset,
        name,
        value,
    ):
        if not value:
            return queryset

        value = value.strip().lower()

        valid_stages = {
            choice[0]
            for choice in AgeGroup.Stage.choices
        }

        if value not in valid_stages:
            return queryset.none()

        return queryset.filter(
            products__age_groups__stage=value,
            products__status=Product.Status.ACTIVE,
        ).distinct()


# ============================================================
# DEPARTMENT FILTER
# ============================================================

class DepartmentFilter(filters.FilterSet):
    """
    Department filtering.
    """

    has_products = filters.BooleanFilter(
        method="filter_has_products"
    )

    has_categories = filters.BooleanFilter(
        method="filter_has_categories"
    )

    class Meta:
        model = Department

        fields = [
            "has_products",
            "has_categories",
        ]

    # ========================================================
    # HAS PRODUCTS
    # ========================================================

    def filter_has_products(
        self,
        queryset,
        name,
        value,
    ):
        if value:
            return queryset.filter(
                categories__products__status=
                Product.Status.ACTIVE
            ).distinct()

        return queryset

    # ========================================================
    # HAS CATEGORIES
    # ========================================================

    def filter_has_categories(
        self,
        queryset,
        name,
        value,
    ):
        if value:
            return queryset.filter(
                categories__is_active=True
            ).distinct()

        return queryset
