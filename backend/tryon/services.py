import logging
import threading
from django.conf import settings
from django.core.files.base import ContentFile
from django.db import close_old_connections
from . import providers
from .models import TryOnRequest

logger = logging.getLogger(__name__)


def garment_bytes(product, color):
    """Bytes of the best product photo for this colour (primary, front-first)."""
    images = [i for i in product.images.all() if i.image]
    if not images:
        return None
    images.sort(key=lambda i: (i.view != "front", not i.is_primary, i.order, i.id))
    wanted = (color or "").strip().lower()
    chosen = next((i for i in images if wanted and (i.color or "").strip().lower() == wanted), images[0])
    try:
        with chosen.image.open("rb") as fh:
            return fh.read()
    except Exception:
        logger.exception("Could not read garment image %s", chosen.pk)
        return None


def is_eligible(product):
    ids = settings.TRYON_PILOT_PRODUCT_IDS
    return (not ids or product.pk in ids) and product.images.exists()


def process(request_id):
    close_old_connections()
    try:
        req = TryOnRequest.objects.select_related("product").get(pk=request_id)
        req.status = TryOnRequest.Status.PROCESSING
        req.provider = settings.TRYON_PROVIDER
        req.save(update_fields=["status", "provider"])
        products = [req.product, *req.extra_products.all()]
        garments, names = [], []
        for p in products:
            data = garment_bytes(p, req.color if p.pk == req.product_id else "")
            if data:
                garments.append(data)
                names.append(p.name)
        if not garments:
            raise providers.TryOnError("This product has no photo we can use for try-on.")
        with req.source_photo.open("rb") as fh:
            person = fh.read()
        out = providers.render(person, garments, names, req.color)
        req.result_image.save(f"look-{req.pk}.jpg", ContentFile(out), save=False)
        req.status = TryOnRequest.Status.DONE
        req.error = ""
        # Privacy: don't keep the shopper's original photo once the preview exists.
        if not settings.TRYON_KEEP_SOURCE and req.source_photo:
            req.source_photo.delete(save=False)
            req.source_photo = None
        req.save()
    except providers.TryOnError as exc:
        TryOnRequest.objects.filter(pk=request_id).update(status=TryOnRequest.Status.FAILED, error=str(exc)[:255])
    except Exception:
        logger.exception("Try-on %s crashed", request_id)
        TryOnRequest.objects.filter(pk=request_id).update(
            status=TryOnRequest.Status.FAILED, error="Something went wrong. Please try again.")
    finally:
        close_old_connections()


def enqueue(request_id):
    threading.Thread(target=process, args=(request_id,), daemon=True).start()
