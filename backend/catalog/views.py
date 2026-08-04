from rest_framework import viewsets, generics, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Department, Category, Brand, Product, ProductImage, Review, Wishlist
from .serializers import (
    DepartmentSerializer, CategorySerializer, BrandSerializer,
    ProductListSerializer, ProductDetailSerializer, ProductWriteSerializer,
    ProductImageSerializer, ReviewSerializer, WishlistSerializer,
)
from .permissions import IsOwnerVendorOrReadOnly


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return u.is_authenticated and (u.is_staff or getattr(u, "role", None) == "admin")


class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.AllowAny]


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.select_related("department")
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ["department__slug"]


class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]


class ProductViewSet(viewsets.ModelViewSet):
    """
    Public: list/retrieve active products only.
    Vendors: manage their own products (any status) via /api/catalog/my-products/ instead.
    """
    queryset = Product.objects.filter(status=Product.Status.ACTIVE).select_related("vendor", "category", "brand").prefetch_related("images")
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category__slug", "category__department__slug", "brand__slug", "vendor__slug"]
    search_fields = ["name", "description", "brand__name"]
    ordering_fields = ["price", "created_at", "rating_avg"]
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        if self.action == "list":
            return ProductListSerializer
        return ProductDetailSerializer

    def get_permissions(self):
        return [permissions.AllowAny()]


class MyProductsViewSet(viewsets.ModelViewSet):
    """Vendor-only CRUD over their own catalog, any status."""
    serializer_class = ProductWriteSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerVendorOrReadOnly]

    def get_queryset(self):
        if not hasattr(self.request.user, "vendor_profile"):
            return Product.objects.none()
        return Product.objects.filter(vendor=self.request.user.vendor_profile)

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user.vendor_profile, sku=serializer.validated_data.get("sku"))

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser], url_path="images")
    def upload_image(self, request, pk=None):
        """Vendor Product Management: attach a photo to one of the vendor's own products."""
        product = self.get_object()
        image_file = request.FILES.get("image")
        if not image_file:
            return Response({"detail": "image file is required"}, status=status.HTTP_400_BAD_REQUEST)
        make_primary = request.data.get("is_primary") in ("true", "True", "1", True)
        next_order = product.images.count()
        if make_primary:
            product.images.exclude(order=0).update()  # no-op guard; ordering below handles primacy
            product.images.update(order=next_order + 1)
            order = 0
        else:
            order = next_order
        image = ProductImage.objects.create(product=product, image=image_file, order=order)
        return Response(ProductImageSerializer(image).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"images/(?P<image_id>\d+)")
    def delete_image(self, request, pk=None, image_id=None):
        product = self.get_object()
        product.images.filter(id=image_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Review.objects.filter(product_id=self.kwargs["product_pk"])

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, product_id=self.kwargs["product_pk"])


class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AdminProductModerationViewSet(viewsets.ModelViewSet):
    """Admin 'Product Moderation' module: review vendor submissions, approve/reject."""
    queryset = Product.objects.select_related("vendor", "category").all()
    serializer_class = ProductDetailSerializer
    permission_classes = [IsAdminUser]
    filterset_fields = ["status"]

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        product = self.get_object()
        product.status = Product.Status.ACTIVE
        product.save(update_fields=["status"])
        self._notify(product, "Product approved", f"'{product.name}' is now live on the storefront.")
        return Response(ProductDetailSerializer(product).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        product = self.get_object()
        product.status = Product.Status.REJECTED
        product.save(update_fields=["status"])
        self._notify(product, "Product rejected", f"'{product.name}' was rejected during moderation.")
        return Response(ProductDetailSerializer(product).data)

    def _notify(self, product, title, body):
        from notifications.utils import notify
        from notifications.models import Notification
        notify(product.vendor.user, title, body, Notification.Category.VENDOR)
