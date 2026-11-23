from datetime import timedelta
from django.conf import settings
from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404
from django.utils import timezone
from PIL import Image
from rest_framework import permissions, status, views
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from catalog.models import Product
from . import services
from .models import TryOnRequest
from .serializers import TryOnSerializer

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


def _validate_photo(f):
    if f.size > settings.TRYON_MAX_UPLOAD_MB * 1024 * 1024:
        raise ValidationError(f"Photo is too large (max {settings.TRYON_MAX_UPLOAD_MB} MB).")
    try:
        img = Image.open(f)
        fmt, (w, h) = img.format, img.size
        img.verify()
    except Exception:
        raise ValidationError("That file isn't a valid photo. Please upload a JPG, PNG or WebP.")
    f.seek(0)
    if fmt not in ALLOWED_FORMATS:
        raise ValidationError("Please upload a JPG, PNG or WebP photo.")
    if min(w, h) < 320:
        raise ValidationError("Photo is too small. Use a clear photo at least 320px on the short side.")


class TryOnConfigView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            "enabled": True,
            "provider": settings.TRYON_PROVIDER,
            "photorealistic": settings.TRYON_PROVIDER != "mock",
            "daily_limit": settings.TRYON_DAILY_LIMIT,
            "max_upload_mb": settings.TRYON_MAX_UPLOAD_MB,
            "retention_days": settings.TRYON_RETENTION_DAYS,
            "keeps_original_photo": settings.TRYON_KEEP_SOURCE,
            "privacy_notice": (
                "Your photo is sent to our AI provider only to create this preview. "
                + ("" if settings.TRYON_KEEP_SOURCE else "We delete your original photo as soon as the preview is ready. ")
                + f"Previews you don't save are removed after {settings.TRYON_RETENTION_DAYS} days, and you can delete any look at any time."
            ),
        })


class TryOnCreateView(views.APIView):
    """POST multipart: product, [extra_products], [color], consent=true, photo | use_profile_photo=true."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if str(request.data.get("consent", "")).lower() not in {"true", "1", "yes", "on"}:
            raise ValidationError("Please agree to photo processing to use virtual try-on.")

        since = timezone.now() - timedelta(days=1)
        if TryOnRequest.objects.filter(user=request.user, created_at__gte=since).count() >= settings.TRYON_DAILY_LIMIT:
            raise ValidationError(f"You've reached today's limit of {settings.TRYON_DAILY_LIMIT} try-ons. Come back tomorrow!")

        product = get_object_or_404(Product, pk=request.data.get("product"), status=Product.Status.ACTIVE)
        if not services.is_eligible(product):
            raise ValidationError("Try-on isn't available for this product yet.")

        extra_ids = [i for i in request.data.getlist("extra_products") if str(i).isdigit()][:2]
        extras = list(Product.objects.filter(pk__in=extra_ids, status=Product.Status.ACTIVE).exclude(pk=product.pk))
        extras = [p for p in extras if services.is_eligible(p)]

        photo = request.FILES.get("photo")
        if photo:
            _validate_photo(photo)
        elif str(request.data.get("use_profile_photo", "")).lower() in {"true", "1"} and request.user.profile_picture:
            photo = request.user.profile_picture
        else:
            raise ValidationError("Please upload a photo of yourself.")

        req = TryOnRequest(user=request.user, product=product, color=(request.data.get("color") or "")[:40],
                           consent_at=timezone.now())
        if request.FILES.get("photo"):
            req.source_photo.save("photo.jpg", photo, save=False)
        else:
            with photo.open("rb") as fh:
                req.source_photo.save("photo.jpg", ContentFile(fh.read()), save=False)
        req.save()
        req.extra_products.set(extras)
        services.enqueue(req.pk)
        return Response(TryOnSerializer(req, context={"request": request}).data, status=status.HTTP_202_ACCEPTED)


class TryOnDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        req = get_object_or_404(TryOnRequest, pk=pk, user=request.user)
        return Response(TryOnSerializer(req, context={"request": request}).data)

    def delete(self, request, pk):
        req = get_object_or_404(TryOnRequest, pk=pk, user=request.user)
        for f in (req.source_photo, req.result_image):
            if f:
                f.delete(save=False)
        req.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TryOnSaveView(views.APIView):
    """POST {saved: bool} - save to / remove from 'My looks'."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        req = get_object_or_404(TryOnRequest, pk=pk, user=request.user, status=TryOnRequest.Status.DONE)
        req.is_saved = bool(request.data.get("saved", True))
        req.save(update_fields=["is_saved"])
        return Response(TryOnSerializer(req, context={"request": request}).data)


class TryOnShareView(views.APIView):
    """POST {shared: bool} - turn the public share link on/off."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        req = get_object_or_404(TryOnRequest, pk=pk, user=request.user, status=TryOnRequest.Status.DONE)
        req.is_shared = bool(request.data.get("shared", True))
        if req.is_shared:
            req.is_saved = True  # a shared look must not expire from under the link
        req.save(update_fields=["is_shared", "is_saved"])
        return Response(TryOnSerializer(req, context={"request": request}).data)


class MyLooksView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = (TryOnRequest.objects.filter(user=request.user, is_saved=True, status=TryOnRequest.Status.DONE)
              .select_related("product").prefetch_related("extra_products"))
        return Response(TryOnSerializer(qs, many=True, context={"request": request}).data)


class SharedLookView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        req = get_object_or_404(TryOnRequest, share_token=token, is_shared=True, status=TryOnRequest.Status.DONE)
        data = TryOnSerializer(req, context={"request": request}).data
        data.pop("share_path", None)
        return Response(data)
