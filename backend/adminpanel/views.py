"""
Admin-panel API (/api/admin-panel/).

Everything the existing endpoints don't already cover for a full back-office:
  * products   – full CRUD + image & variant management (admin picks the vendor)
  * departments / categories / brands / age-groups – CRUD + media upload
  * orders     – list / detail / status changes
  * users      – list / create / edit / (de)activate
  * overview   – dashboard numbers & chart series
  * lookups    – one call that feeds every dropdown in the admin forms

Vendor approval, product moderation, coupons/campaigns/videos, support tickets,
dispatch, analytics and the AI dashboard keep using their existing endpoints.
"""
from datetime import timedelta
from decimal import Decimal

import logging

from django.contrib.auth import get_user_model
from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, parsers, status, views, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from catalog.models import (
    AgeGroup, AgeGroupMedia, Brand, BrandMedia, Category, CategoryMedia, Department,
    DepartmentMedia, Product, ProductImage, ProductVariant,
)
from orders.models import Order, OrderItem
from vendors.models import Vendor
from catalog.meshy import start_product_generation, refresh_product_generation, import_completed_meshy_task

logger = logging.getLogger(__name__)

from .pagination import AdminPagination
from .permissions import IsPlatformAdmin
from .serializers import (
    AdminAgeGroupSerializer, AdminBrandSerializer, AdminCategorySerializer,
    AdminDepartmentSerializer, AdminOrderListSerializer, AdminOrderSerializer,
    AdminProductImageSerializer, AdminProductSerializer, AdminProductVariantSerializer,
    AdminUserSerializer, media_payload,
)

User = get_user_model()

JSON_AND_FILES = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]
ACTIVE_ORDER_EXCLUDE = ["cancelled", "pending_payment", "refunded"]
MAX_UPLOAD = 5 * 1024 * 1024


class _Fresh:
    """Tiny adapter so media_payload() can iterate a freshly-queried media set."""

    def __init__(self, obj, media_model, fk):
        self.media_files = media_model.objects.filter(**{fk: obj}).order_by("-is_primary", "order", "id")


class AdminBase:
    permission_classes = [IsPlatformAdmin]
    pagination_class = AdminPagination
    parser_classes = JSON_AND_FILES


# ----------------------------------------------------------------------
# Catalog structure (with media)
# ----------------------------------------------------------------------

class MediaActionsMixin:
    """Adds /media/ upload, delete and set-primary to a catalog-structure viewset."""
    media_model = None
    media_fk = None  # name of the FK on the media model

    def _media(self, obj, request):
        # get_object() prefetches media_files, so re-read instead of trusting that cache.
        return media_payload(_Fresh(obj, self.media_model, self.media_fk), request)

    @action(detail=True, methods=["post"], url_path="media", parser_classes=[parsers.MultiPartParser, parsers.FormParser])
    def add_media(self, request, pk=None):
        obj = self.get_object()
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "A 'file' upload is required."}, status=status.HTTP_400_BAD_REQUEST)
        media_type = request.data.get("media_type") or ("video" if (upload.content_type or "").startswith("video/") else "image")
        if media_type not in ("image", "video"):
            return Response({"detail": "media_type must be 'image' or 'video'."}, status=status.HTTP_400_BAD_REQUEST)
        if media_type == "image" and upload.size > MAX_UPLOAD:
            return Response({"detail": "Image size should not exceed 5MB."}, status=status.HTTP_400_BAD_REQUEST)
        existing = obj.media_files.all()
        make_primary = request.data.get("is_primary") in ("true", "True", "1", True) or not existing.exists()
        if make_primary:
            existing.update(is_primary=False)
        self.media_model.objects.create(
            **{self.media_fk: obj}, file=upload, media_type=media_type,
            alt_text=request.data.get("alt_text", ""), is_primary=make_primary, order=existing.count(),
        )
        return Response(self._media(obj, request), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"media/(?P<media_id>\d+)")
    def delete_media(self, request, pk=None, media_id=None):
        obj = self.get_object()
        media = get_object_or_404(obj.media_files, pk=media_id)
        was_primary = media.is_primary
        media.delete()
        if was_primary:
            nxt = obj.media_files.first()
            if nxt:
                nxt.is_primary = True
                nxt.save(update_fields=["is_primary"])
        return Response(self._media(obj, request))

    @action(detail=True, methods=["post"], url_path=r"media/(?P<media_id>\d+)/set-primary")
    def set_primary_media(self, request, pk=None, media_id=None):
        obj = self.get_object()
        media = get_object_or_404(obj.media_files, pk=media_id)
        obj.media_files.update(is_primary=False)
        media.is_primary = True
        media.save(update_fields=["is_primary"])
        return Response(self._media(obj, request))


class AdminDepartmentViewSet(AdminBase, MediaActionsMixin, viewsets.ModelViewSet):
    serializer_class = AdminDepartmentSerializer
    media_model, media_fk = DepartmentMedia, "department"
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["order", "name", "created_at"]
    ordering = ["order", "name"]

    def get_queryset(self):
        return Department.objects.annotate(
            category_count=Count("categories", distinct=True),
            product_count=Count("categories__products", distinct=True),
        ).prefetch_related("media_files")


class AdminCategoryViewSet(AdminBase, MediaActionsMixin, viewsets.ModelViewSet):
    serializer_class = AdminCategorySerializer
    media_model, media_fk = CategoryMedia, "category"
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["department", "parent", "is_active"]
    search_fields = ["name", "department__name", "parent__name"]
    ordering_fields = ["order", "name", "created_at"]
    ordering = ["department__order", "order", "name"]

    def get_queryset(self):
        qs = Category.objects.select_related("department", "parent").annotate(
            product_count=Count("products", distinct=True)
        ).prefetch_related("media_files")
        if self.request.query_params.get("top_level") == "true":
            qs = qs.filter(parent__isnull=True)
        return qs

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.products.exists():
            return Response(
                {"detail": f"'{obj.name}' still has {obj.products.count()} product(s). Move or delete them first."},
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)


class AdminBrandViewSet(AdminBase, MediaActionsMixin, viewsets.ModelViewSet):
    serializer_class = AdminBrandSerializer
    media_model, media_fk = BrandMedia, "brand"
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return Brand.objects.annotate(product_count=Count("products", distinct=True)).prefetch_related("media_files")


class AdminAgeGroupViewSet(AdminBase, MediaActionsMixin, viewsets.ModelViewSet):
    serializer_class = AdminAgeGroupSerializer
    media_model, media_fk = AgeGroupMedia, "age_group"
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["stage", "is_active"]
    search_fields = ["name"]
    ordering_fields = ["order", "name", "stage"]
    ordering = ["stage", "order"]

    def get_queryset(self):
        return AgeGroup.objects.annotate(product_count=Count("products", distinct=True)).prefetch_related("media_files")


# ----------------------------------------------------------------------
# Products
# ----------------------------------------------------------------------

class AdminProductViewSet(AdminBase, viewsets.ModelViewSet):
    serializer_class = AdminProductSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "vendor", "category", "brand", "gender", "is_featured"]
    search_fields = ["name", "sku", "vendor__store_name", "brand__name", "category__name"]
    ordering_fields = ["created_at", "price", "name", "stock", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = Product.objects.select_related("vendor", "category", "category__department", "brand").prefetch_related(
            "images", "variants", "age_groups"
        )
        p = self.request.query_params
        if p.get("department"):
            qs = qs.filter(category__department_id=p["department"])
        if p.get("low_stock"):
            qs = qs.filter(stock__lte=int(p["low_stock"]))
        return qs

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        if OrderItem.objects.filter(product=product).exists():
            return Response(
                {"detail": "This product appears in past orders and can't be deleted. Set its status to Draft or Rejected to hide it from the store."},
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = Product.objects.all()
        return Response({
            "total": qs.count(),
            "active": qs.filter(status="active").count(),
            "pending": qs.filter(status="pending").count(),
            "draft": qs.filter(status="draft").count(),
            "rejected": qs.filter(status="rejected").count(),
            "out_of_stock": qs.filter(status="active", stock=0).count(),
            "low_stock": qs.filter(status="active", stock__gt=0, stock__lte=5).count(),
        })

    # get_object() prefetches images/variants, so the helpers below re-query instead of using that cache.
    def _images(self, product, request):
        qs = ProductImage.objects.filter(product=product).order_by("color", "-is_primary", "order", "id")
        return AdminProductImageSerializer(qs, many=True, context={"request": request}).data

    def _variants(self, product):
        return AdminProductVariantSerializer(ProductVariant.objects.filter(product=product).order_by("id"), many=True).data

    def _generation_busy(self, product):
        return product.ar_generation_status in (
            Product.ARGenerationStatus.QUEUED,
            Product.ARGenerationStatus.PROCESSING,
        )

    def _invalidate_3d(self, product):
        """Remove generated geometry whenever its source photo set changes."""
        for field_name in ("model_3d", "model_3d_ios"):
            field = getattr(product, field_name)
            if field:
                try:
                    field.delete(save=False)
                except Exception:
                    # A missing old file must not prevent the admin from fixing
                    # the source gallery; the database references are cleared below.
                    logger.exception("Could not delete stale %s for product %s", field_name, product.pk)
        product.model_3d_poster = None
        product.ar_generation_status = Product.ARGenerationStatus.NOT_STARTED
        product.ar_generation_task_id = ""
        product.ar_generation_error = ""
        product.ar_generation_updated_at = None
        product.save(update_fields=[
            "model_3d", "model_3d_ios", "model_3d_poster",
            "ar_generation_status", "ar_generation_task_id",
            "ar_generation_error", "ar_generation_updated_at",
        ])

    # --- moderation (same effect + vendor notification as /catalog/admin/products/<id>/approve|reject) ---
    def _notify_vendor(self, product, title, body):
        try:
            from notifications.models import Notification
            from notifications.utils import notify
            notify(product.vendor.user, title, body, Notification.Category.VENDOR)
        except Exception:  # a notification problem must never block a moderation decision
            pass

    def _moderate(self, product, new_status, title, body):
        product.status = new_status
        product.save(update_fields=["status", "updated_at"])
        self._notify_vendor(product, title, body)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        product = self.get_object()
        self._moderate(product, Product.Status.ACTIVE, "Product Approved",
                       f"Your product '{product.name}' has been approved and is now live on the storefront.")
        return Response(self.get_serializer(self.get_queryset().get(pk=product.pk)).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        product = self.get_object()
        reason = request.data.get("reason") or "No reason provided"
        self._moderate(product, Product.Status.REJECTED, "Product Rejected",
                       f"Your product '{product.name}' was rejected. Reason: {reason}")
        return Response(self.get_serializer(self.get_queryset().get(pk=product.pk)).data)

    @action(detail=True, methods=["post"], url_path="request-changes")
    def request_changes(self, request, pk=None):
        product = self.get_object()
        feedback = request.data.get("feedback") or ""
        self._moderate(product, Product.Status.PENDING, "Changes Requested",
                       f"Changes requested for '{product.name}'. Feedback: {feedback}")
        return Response(self.get_serializer(self.get_queryset().get(pk=product.pk)).data)

    @action(detail=False, methods=["post"], url_path="bulk-status")
    def bulk_status(self, request):
        ids = request.data.get("product_ids") or []
        new_status = request.data.get("status")
        if not ids:
            return Response({"detail": "No product IDs provided."}, status=status.HTTP_400_BAD_REQUEST)
        if new_status not in Product.Status.values:
            return Response({"detail": f"status must be one of: {', '.join(Product.Status.values)}"}, status=status.HTTP_400_BAD_REQUEST)
        reason = request.data.get("reason") or "No reason provided"
        products = list(Product.objects.filter(pk__in=ids).select_related("vendor__user"))
        for product in products:
            if new_status == Product.Status.ACTIVE:
                self._moderate(product, new_status, "Product Approved", f"Your product '{product.name}' has been approved.")
            elif new_status == Product.Status.REJECTED:
                self._moderate(product, new_status, "Product Rejected", f"Your product '{product.name}' was rejected. Reason: {reason}")
            else:
                product.status = new_status
                product.save(update_fields=["status", "updated_at"])
        return Response({"updated": len(products)})

    # --- Meshy image-to-3D generation ---
    @action(detail=True, methods=["post"], url_path="generate-3d")
    def generate_3d(self, request, pk=None):
        product = self.get_object()
        try:
            result = start_product_generation(product, request=request)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(result, status=status.HTTP_202_ACCEPTED)


    @action(detail=True, methods=["post"], url_path="import-meshy-task")
    def import_meshy_task(self, request, pk=None):
        """Attach a completed Meshy task without generating (or charging) again."""
        product = self.get_object()
        task_id = (request.data.get("task_id") or "").strip()
        try:
            result = import_completed_meshy_task(product, task_id)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="3d-status")
    def three_d_status(self, request, pk=None):
        product = self.get_object()
        try:
            result = refresh_product_generation(product)
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(result)

    # --- images ---
    @action(detail=True, methods=["post"], url_path=r"images/import")
    def import_repository_image(self, request, pk=None):
        """Attach an image already present in the configured media repository."""
        product = self.get_object()
        path = (request.data.get("path") or "").strip().lstrip("/")
        if (
            not path.startswith("products/")
            or ".." in path.split("/")
            or "\\" in path
            or not path.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
        ):
            return Response(
                {"detail": "Enter a valid products/ image path ending in JPG, PNG or WebP."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        color = (request.data.get("color") or "").strip()
        view = request.data.get("view") or ProductImage.View.FRONT
        if view not in ProductImage.View.values:
            return Response(
                {"detail": f"view must be one of: {', '.join(ProductImage.View.values)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if self._generation_busy(product):
            return Response(
                {"detail": "Wait for the current 3D generation to finish before changing product photos."},
                status=status.HTTP_409_CONFLICT,
            )
        storage = ProductImage._meta.get_field("image").storage
        try:
            if not storage.exists(path):
                return Response(
                    {"detail": f"'{path}' was not found in the configured media repository."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        except Exception:
            logger.exception("Unable to verify repository image %s", path)
            return Response(
                {"detail": "Could not access the media repository. Check its configuration and try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        if ProductImage.objects.filter(product=product, image=path).exists():
            return Response(
                {"detail": "This repository image is already attached to the product."},
                status=status.HTTP_409_CONFLICT,
            )
        self._invalidate_3d(product)
        image = ProductImage.objects.create(
            product=product,
            image=path,
            color=color,
            view=view,
            alt_text=request.data.get("alt_text", "") or product.name,
            order=ProductImage.group(product.id, color).count(),
        )
        return Response(self._images(product, request), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="images", parser_classes=[parsers.MultiPartParser, parsers.FormParser])
    def upload_images(self, request, pk=None):
        product = self.get_object()
        files = request.FILES.getlist("image") or request.FILES.getlist("images")
        if not files:
            return Response({"detail": "At least one 'image' file is required."}, status=status.HTTP_400_BAD_REQUEST)
        for f in files:
            if f.size > MAX_UPLOAD:
                return Response({"detail": f"'{f.name}' is larger than 5MB."}, status=status.HTTP_400_BAD_REQUEST)
        make_primary = request.data.get("is_primary") in ("true", "True", "1", True)
        color = (request.data.get("color", "") or "").strip()
        view = request.data.get("view") or ProductImage.View.FRONT
        if view not in ProductImage.View.values:
            return Response({"detail": f"view must be one of: {', '.join(ProductImage.View.values)}"}, status=status.HTTP_400_BAD_REQUEST)
        alt = request.data.get("alt_text", "") or product.name
        if self._generation_busy(product):
            return Response(
                {"detail": "Wait for the current 3D generation to finish before changing product photos."},
                status=status.HTTP_409_CONFLICT,
            )
        self._invalidate_3d(product)
        # New photos are appended to the end of THIS color's gallery.
        start = ProductImage.group(product.id, color).count()
        for i, f in enumerate(files):
            img = ProductImage.objects.create(product=product, image=f, color=color, view=view, alt_text=alt, order=start + i)
            if make_primary and i == 0:  # only one photo can be a color's primary
                ProductImage.set_primary(img)
        return Response(self._images(product, request), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path=r"images/(?P<image_id>\d+)")
    def image_detail(self, request, pk=None, image_id=None):
        product = self.get_object()
        image = get_object_or_404(product.images, pk=image_id)
        if request.method == "DELETE":
            if self._generation_busy(product):
                return Response(
                    {"detail": "Wait for the current 3D generation to finish before changing product photos."},
                    status=status.HTTP_409_CONFLICT,
                )
            self._invalidate_3d(product)
            image.delete()  # the color's next photo is promoted if this was its primary
        else:
            geometry_fields = {"color", "view", "order", "is_primary"}
            changes_geometry = bool(geometry_fields.intersection(request.data.keys()))
            if "view" in request.data and request.data["view"] not in ProductImage.View.values:
                return Response({"detail": f"view must be one of: {', '.join(ProductImage.View.values)}"}, status=status.HTTP_400_BAD_REQUEST)
            if "order" in request.data and not str(request.data["order"]).isdigit():
                return Response({"detail": "order must be a non-negative integer."}, status=status.HTTP_400_BAD_REQUEST)
            if changes_geometry:
                if self._generation_busy(product):
                    return Response(
                        {"detail": "Wait for the current 3D generation to finish before changing product photos."},
                        status=status.HTTP_409_CONFLICT,
                    )
                self._invalidate_3d(product)
            for field in ("color", "alt_text", "view", "order"):
                if field in request.data:
                    setattr(image, field, request.data[field])
            if request.data.get("is_primary") in (True, "true", "True", "1"):
                image.is_primary = True  # save() demotes the color's previous primary
            image.save()
        return Response(self._images(product, request))

    @action(detail=True, methods=["post"], url_path=r"images/(?P<image_id>\d+)/set-primary")
    def set_primary_image(self, request, pk=None, image_id=None):
        product = self.get_object()
        chosen = get_object_or_404(product.images, pk=image_id)
        if self._generation_busy(product):
            return Response(
                {"detail": "Wait for the current 3D generation to finish before changing product photos."},
                status=status.HTTP_409_CONFLICT,
            )
        self._invalidate_3d(product)
        ProductImage.set_primary(chosen)
        return Response(self._images(product, request))

    # --- variants ---
    @action(detail=True, methods=["post"], url_path="variants")
    def add_variant(self, request, pk=None):
        product = self.get_object()
        ser = AdminProductVariantSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save(product=product)
        return Response(self._variants(product), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path=r"variants/(?P<variant_id>\d+)")
    def variant_detail(self, request, pk=None, variant_id=None):
        product = self.get_object()
        variant = get_object_or_404(product.variants, pk=variant_id)
        if request.method == "DELETE":
            variant.delete()
        else:
            ser = AdminProductVariantSerializer(variant, data=request.data, partial=True)
            ser.is_valid(raise_exception=True)
            ser.save()
        return Response(self._variants(product))


# ----------------------------------------------------------------------
# Orders
# ----------------------------------------------------------------------

class AdminOrderViewSet(AdminBase, viewsets.ReadOnlyModelViewSet):
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "payment_method"]
    search_fields = ["order_number", "shipping_name", "shipping_phone", "guest_email", "user__email", "user__username"]
    ordering_fields = ["created_at", "total", "status"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        return AdminOrderListSerializer if self.action == "list" else AdminOrderSerializer

    def get_queryset(self):
        return Order.objects.select_related("user").prefetch_related("items", "items__product", "items__variant")

    @action(detail=True, methods=["post"], url_path="set-status")
    def set_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get("status")
        if new_status not in Order.Status.values:
            return Response({"detail": f"status must be one of: {', '.join(Order.Status.values)}"}, status=status.HTTP_400_BAD_REQUEST)
        order.status = new_status
        order.save(update_fields=["status", "updated_at"])  # pre_save signal notifies the customer
        return Response(AdminOrderSerializer(order, context={"request": request}).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        counts = dict(Order.objects.values_list("status").annotate(n=Count("id")))
        return Response({"by_status": counts, "total": sum(counts.values())})


# ----------------------------------------------------------------------
# Users
# ----------------------------------------------------------------------

class AdminUserViewSet(AdminBase, viewsets.ModelViewSet):
    serializer_class = AdminUserSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]  # deactivate instead of delete
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["role", "is_active"]
    search_fields = ["username", "email", "phone", "first_name", "last_name"]
    ordering_fields = ["date_joined", "username", "last_login", "orders_count"]
    ordering = ["-date_joined"]

    def get_queryset(self):
        return User.objects.annotate(orders_count=Count("orders", distinct=True))


# ----------------------------------------------------------------------
# Dashboard overview
# ----------------------------------------------------------------------

def _pct_change(current, previous):
    current, previous = float(current or 0), float(previous or 0)
    if previous == 0:
        return None if current == 0 else 100.0
    return round((current - previous) / previous * 100, 1)


class AdminOverviewView(views.APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        try:
            days = max(1, min(int(request.query_params.get("days", 30)), 365))
        except ValueError:
            days = 30
        now = timezone.now()
        since = now - timedelta(days=days)
        prev_since = since - timedelta(days=days)

        paid = Order.objects.exclude(status__in=ACTIVE_ORDER_EXCLUDE)
        cur = paid.filter(created_at__gte=since)
        prev = paid.filter(created_at__gte=prev_since, created_at__lt=since)

        revenue = cur.aggregate(t=Sum("total"))["t"] or Decimal("0")
        revenue_prev = prev.aggregate(t=Sum("total"))["t"] or Decimal("0")
        orders_n, orders_prev = cur.count(), prev.count()
        users_n = User.objects.filter(date_joined__gte=since, role="customer").count()
        users_prev = User.objects.filter(date_joined__gte=prev_since, date_joined__lt=since, role="customer").count()

        # Daily series, zero-filled so the chart has no gaps.
        by_day = {
            row["d"]: row
            for row in cur.annotate(d=TruncDate("created_at")).values("d").annotate(orders=Count("id"), revenue=Sum("total"))
        }
        series = []
        for i in range(days):
            d = (since + timedelta(days=i + 1)).astimezone(timezone.get_current_timezone()).date()
            row = by_day.get(d)
            series.append({"date": d.isoformat(), "orders": row["orders"] if row else 0,
                           "revenue": float(row["revenue"]) if row else 0.0})

        line_total = ExpressionWrapper(F("unit_price") * F("quantity"), output_field=DecimalField(max_digits=14, decimal_places=2))
        by_department = list(
            OrderItem.objects.filter(order__created_at__gte=since).exclude(order__status__in=ACTIVE_ORDER_EXCLUDE)
            .values(name=F("product__category__department__name"))
            .annotate(revenue=Sum(line_total), units=Sum("quantity")).order_by("-revenue")[:8]
        )
        for row in by_department:
            row["revenue"] = float(row["revenue"] or 0)

        recent = Order.objects.select_related("user").prefetch_related("items").order_by("-created_at")[:8]
        low_stock = (
            Product.objects.filter(status="active", stock__lte=5).prefetch_related("images").order_by("stock", "name")[:8]
        )
        from notifications.models import SupportTicket

        return Response({
            "range_days": days,
            "revenue": float(revenue), "revenue_change": _pct_change(revenue, revenue_prev),
            "orders": orders_n, "orders_change": _pct_change(orders_n, orders_prev),
            "new_customers": users_n, "new_customers_change": _pct_change(users_n, users_prev),
            "avg_order_value": float(revenue / orders_n) if orders_n else 0.0,
            "sales_by_day": series,
            "orders_by_status": dict(Order.objects.filter(created_at__gte=since).values_list("status").annotate(n=Count("id"))),
            "sales_by_department": by_department,
            "recent_orders": AdminOrderListSerializer(recent, many=True, context={"request": request}).data,
            "low_stock": [
                {"id": p.id, "name": p.name, "sku": p.sku, "stock": p.stock,
                 "image": (lambda imgs: request.build_absolute_uri(imgs[0].image.url) if imgs else None)(list(p.images.all()))}
                for p in low_stock
            ],
            "totals": {
                "products": Product.objects.count(),
                "active_products": Product.objects.filter(status="active").count(),
                "pending_products": Product.objects.filter(status="pending").count(),
                "customers": User.objects.filter(role="customer").count(),
                "vendors": Vendor.objects.filter(status="approved").count(),
                "pending_vendors": Vendor.objects.filter(status="pending").count(),
                "open_tickets": SupportTicket.objects.filter(status__in=["open", "in_progress"]).count(),
            },
        })


# ----------------------------------------------------------------------
# Dropdown data for forms
# ----------------------------------------------------------------------

class AdminLookupsView(views.APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        cats = Category.objects.select_related("department", "parent").order_by("department__order", "order", "name")

        def label(c):
            parts = [c.department.name]
            if c.parent:
                parts.append(c.parent.name)
            parts.append(c.name)
            return " › ".join(parts)

        return Response({
            "vendors": list(Vendor.objects.order_by("store_name").values("id", "store_name", "status")),
            "departments": list(Department.objects.order_by("order", "name").values("id", "name")),
            "categories": [
                {"id": c.id, "name": c.name, "label": label(c), "department": c.department_id, "parent": c.parent_id}
                for c in cats
            ],
            "brands": list(Brand.objects.order_by("name").values("id", "name")),
            "age_groups": list(AgeGroup.objects.order_by("stage", "order").values("id", "name", "stage")),
            "product_statuses": [{"value": v, "label": l} for v, l in Product.Status.choices],
            "genders": [{"value": v, "label": l} for v, l in Product.Gender.choices],
            "order_statuses": [{"value": v, "label": l} for v, l in Order.Status.choices],
            "payment_methods": [{"value": v, "label": l} for v, l in Order.PaymentMethod.choices],
            "roles": [{"value": v, "label": l} for v, l in User.Role.choices],
        })


class AdminMediaMigrationView(views.APIView):
    """Copy legacy GitHub media into R2 in small admin-triggered batches."""
    permission_classes = [IsPlatformAdmin]

    def post(self, request):
        import os
        from django.apps import apps

        required = (
            "AR_STORAGE_BUCKET_NAME", "AR_STORAGE_ENDPOINT_URL",
            "AR_STORAGE_ACCESS_KEY_ID", "AR_STORAGE_SECRET_ACCESS_KEY",
            "GITHUB_MEDIA_TOKEN",
        )
        missing = [key for key in required if not os.environ.get(key, "").strip()]
        if missing:
            return Response(
                {"detail": "Media migration is not configured on the server.", "missing": missing},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            from storages.backends.s3 import S3Storage
            from catalog.github_storage import GitHubMediaStorage
            from catalog.storage import Product3DStorage
            source = GitHubMediaStorage()
            destination = S3Storage(
                bucket_name=os.environ["AR_STORAGE_BUCKET_NAME"].strip(),
                access_key=os.environ["AR_STORAGE_ACCESS_KEY_ID"].strip(),
                secret_key=os.environ["AR_STORAGE_SECRET_ACCESS_KEY"].strip(),
                endpoint_url=os.environ["AR_STORAGE_ENDPOINT_URL"].strip(),
                region_name=os.environ.get("AR_STORAGE_REGION_NAME", "auto"),
                default_acl=None, querystring_auth=False, file_overwrite=True,
                addressing_style="path",
            )
        except Exception:
            logger.exception("Could not initialize media migration storage")
            return Response({"detail": "Could not connect to configured media storage."},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            offset = max(0, int(request.data.get("offset", 0)))
            limit = max(1, min(10, int(request.data.get("limit", 5))))
        except (TypeError, ValueError):
            return Response({"detail": "offset and limit must be integers."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Build a stable, de-duplicated sequence from database references.
        names = []
        seen = set()
        for model in apps.get_models():
            for field in model._meta.get_fields():
                if not getattr(field, "concrete", False):
                    continue
                if field.get_internal_type() not in ("FileField", "ImageField"):
                    continue
                if isinstance(getattr(field, "storage", None), Product3DStorage):
                    continue
                try:
                    qs = model._default_manager.exclude(**{field.name: ""}).exclude(
                        **{f"{field.name}__isnull": True}
                    ).order_by("pk")
                    for record in qs.iterator(chunk_size=200):
                        value = getattr(record, field.name, None)
                        name = getattr(value, "name", "") if value else ""
                        if name and name not in seen:
                            seen.add(name)
                            names.append(name)
                except Exception:
                    logger.exception("Could not enumerate media field %s.%s", model._meta.label, field.name)
                    return Response({"detail": "Could not enumerate all media records; migration stopped safely."},
                                    status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        batch = names[offset:offset + limit]
        copied = skipped = failed = 0
        errors = []
        for name in batch:
            try:
                if destination.exists(name):
                    skipped += 1
                    continue
                with source.open(name, "rb") as file_obj:
                    destination.save(name, file_obj)
                if not destination.exists(name):
                    raise RuntimeError("R2 verification failed after upload.")
                copied += 1
            except Exception as exc:
                failed += 1
                logger.exception("Media migration failed for %s", name)
                errors.append({"file": name, "error": str(exc)[:240]})

        next_offset = offset + len(batch)
        return Response({
            "processed": len(batch), "copied": copied, "already_in_r2": skipped,
            "failed": failed, "errors": errors, "offset": next_offset,
            "total": len(names), "has_more": next_offset < len(names),
            "complete": next_offset >= len(names) and failed == 0,
        }, status=status.HTTP_200_OK)
