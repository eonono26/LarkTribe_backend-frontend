"""Meshy image-to-3D integration.

Only server-side code reads MESHY_API_KEY. Generated files are copied into
Django's configured media storage because Meshy's task URLs expire.
"""
import os
import requests
from django.core.files.base import ContentFile
from django.utils import timezone
from django.conf import settings

from .models import Product, ProductImage

MESHY_API = "https://api.meshy.ai/openapi/v1"
TIMEOUT = (10, 90)


def _api_key():
    key = os.environ.get("MESHY_API_KEY", "").strip()
    if not key:
        raise RuntimeError("MESHY_API_KEY is not configured on the backend.")
    return key


def _headers():
    return {"Authorization": f"Bearer {_api_key()}", "Content-Type": "application/json"}


def _source_images(product, request):
    images = list(product.images.filter(image__isnull=False).exclude(image=""))
    if not images:
        raise ValueError("Upload at least one product photo before generating a 3D model.")

    # Keep one colourway together; mixing different colours can confuse the model.
    primary = next((item for item in images if item.is_primary), images[0])
    group = [item for item in images if (item.color or "").strip().lower() == (primary.color or "").strip().lower()]
    rank = {"front": 0, "back": 1, "side": 2, "detail": 3, "other": 4}
    group.sort(key=lambda item: (rank.get(item.view, 5), not item.is_primary, item.order, item.id))
    chosen = group[:4]
    urls = []
    for item in chosen:
        url = item.image.url
        if request:
            url = request.build_absolute_uri(url)
        else:
            base_url = getattr(settings, "PUBLIC_BACKEND_URL", "").rstrip("/")
            if base_url and url.startswith("/"):
                url = f"{base_url}{url}"
        urls.append(url)
    return urls


def start_product_generation(product, request=None):
    """Queue generation without making a slow Meshy request in the web process."""
    if product.model_3d and product.ar_generation_status == Product.ARGenerationStatus.SUCCEEDED:
        return {"status": product.ar_generation_status, "detail": "A 3D model is already available."}
    if product.ar_generation_status in (Product.ARGenerationStatus.QUEUED, Product.ARGenerationStatus.PROCESSING):
        return {"status": product.ar_generation_status, "task_id": product.ar_generation_task_id or None}
    _source_images(product, request)
    product.ar_generation_status = Product.ARGenerationStatus.QUEUED
    product.ar_generation_task_id = ""
    product.ar_generation_error = ""
    product.ar_generation_updated_at = timezone.now()
    product.save(update_fields=["ar_generation_status", "ar_generation_task_id", "ar_generation_error", "ar_generation_updated_at"])
    return {"status": product.ar_generation_status, "detail": "3D generation has been queued."}


def submit_product_generation(product, request=None):
    if product.model_3d and product.ar_generation_status == Product.ARGenerationStatus.SUCCEEDED:
        return {"status": product.ar_generation_status, "detail": "A 3D model is already available."}
    if product.ar_generation_status in (Product.ARGenerationStatus.QUEUED, Product.ARGenerationStatus.PROCESSING) and product.ar_generation_task_id:
        return {"status": product.ar_generation_status, "task_id": product.ar_generation_task_id}

    image_urls = _source_images(product, request)
    payload = {
        "image_urls": image_urls,
        "ai_model": "meshy-7.1",
        "should_texture": True,
        "enable_pbr": True,
        "target_formats": ["glb", "usdz"],
    }
    try:
        response = requests.post(
            f"{MESHY_API}/multi-image-to-3d",
            headers=_headers(), json=payload, timeout=TIMEOUT,
        )
        response.raise_for_status()
        task_id = response.json().get("result")
        if not task_id:
            raise RuntimeError("Meshy did not return a task ID.")
    except Exception as exc:
        product.ar_generation_status = Product.ARGenerationStatus.FAILED
        product.ar_generation_error = "Could not submit the 3D generation request to Meshy."
        product.ar_generation_updated_at = timezone.now()
        product.save(update_fields=["ar_generation_status", "ar_generation_error", "ar_generation_updated_at"])
        raise RuntimeError(product.ar_generation_error) from exc

    product.ar_generation_task_id = task_id
    product.ar_generation_status = Product.ARGenerationStatus.QUEUED
    product.ar_generation_error = ""
    product.ar_generation_updated_at = timezone.now()
    product.save(update_fields=["ar_generation_task_id", "ar_generation_status", "ar_generation_error", "ar_generation_updated_at"])
    return {"status": product.ar_generation_status, "task_id": task_id}


def _download_to_field(field, url, filename):
    if not url:
        return False
    response = requests.get(url, timeout=TIMEOUT)
    response.raise_for_status()
    field.save(filename, ContentFile(response.content), save=False)
    return True


def refresh_product_generation(product):
    if product.ar_generation_status == Product.ARGenerationStatus.SUCCEEDED:
        return {
            "status": product.ar_generation_status,
            "model_3d_url": product.model_3d.url if product.model_3d else None,
            "model_3d_ios_url": product.model_3d_ios.url if product.model_3d_ios else None,
        }
    if not product.ar_generation_task_id:
        return {"status": product.ar_generation_status, "detail": "No generation task has been started."}

    # Avoid calling Meshy repeatedly when multiple shoppers open the same item.
    if product.ar_generation_updated_at and product.ar_generation_status in (
        Product.ARGenerationStatus.QUEUED,
        Product.ARGenerationStatus.PROCESSING,
    ):
        elapsed = (timezone.now() - product.ar_generation_updated_at).total_seconds()
        if elapsed < 12:
            return {"status": product.ar_generation_status}

    try:
        response = requests.get(
            f"{MESHY_API}/multi-image-to-3d/{product.ar_generation_task_id}",
            headers=_headers(), timeout=TIMEOUT,
        )
        response.raise_for_status()
        task = response.json()
    except requests.RequestException as exc:
        raise RuntimeError("Unable to check the Meshy generation task right now.") from exc

    state = task.get("status", "").upper()
    if state in ("PENDING", "IN_PROGRESS"):
        product.ar_generation_status = Product.ARGenerationStatus.PROCESSING
        product.ar_generation_updated_at = timezone.now()
        product.save(update_fields=["ar_generation_status", "ar_generation_updated_at"])
        return {"status": product.ar_generation_status, "progress": task.get("progress", 0)}

    if state == "SUCCEEDED":
        urls = task.get("model_urls") or {}
        try:
            if not urls.get("glb"):
                raise RuntimeError("Meshy completed the task without a GLB model.")
            _download_to_field(product.model_3d, urls.get("glb"), f"product-{product.pk}.glb")
            if urls.get("usdz"):
                _download_to_field(product.model_3d_ios, urls["usdz"], f"product-{product.pk}.usdz")
        except requests.RequestException as exc:
            raise RuntimeError("Meshy finished, but LarkTribe could not download the generated model files.") from exc

        # Use the product's lead photo as the viewer poster.
        if not product.model_3d_poster:
            lead = product.images.filter(is_primary=True).first() or product.images.first()
            if lead and lead.image:
                product.model_3d_poster = lead.image
        product.ar_generation_status = Product.ARGenerationStatus.SUCCEEDED
        product.ar_generation_error = ""
        product.ar_generation_updated_at = timezone.now()
        product.save()
        return {
            "status": product.ar_generation_status,
            "model_3d_url": product.model_3d.url if product.model_3d else None,
            "model_3d_ios_url": product.model_3d_ios.url if product.model_3d_ios else None,
        }

    if state in ("FAILED", "CANCELED"):
        error = task.get("task_error") or {}
        error_message = error.get("message") if isinstance(error, dict) else str(error)
        product.ar_generation_status = Product.ARGenerationStatus.FAILED
        product.ar_generation_error = str(error_message or "Meshy could not generate a model from these photos.")[:1000]
        product.ar_generation_updated_at = timezone.now()
        product.save(update_fields=["ar_generation_status", "ar_generation_error", "ar_generation_updated_at"])
        return {"status": product.ar_generation_status, "detail": product.ar_generation_error}

    return {"status": product.ar_generation_status, "detail": "Meshy returned an unrecognised task status."}
