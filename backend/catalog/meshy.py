"""Meshy multi-image-to-3D integration.

Meshy performs generation asynchronously. LarkTribe submits tasks in a small
background thread pool so the admin API can respond immediately, persists the
Meshy task ID on Product, and checks task progress on later status requests.

Only server-side code reads MESHY_API_KEY. Generated files are copied into
Django's configured media storage because Meshy's signed URLs expire.
"""
import base64
import logging
import mimetypes
import os
import threading
from concurrent.futures import ThreadPoolExecutor

import requests
from django.core.files.base import ContentFile
from django.db import close_old_connections, transaction
from django.utils import timezone

from .models import Product

MESHY_API = "https://api.meshy.ai/openapi/v1"
TIMEOUT = (10, 90)
SUBMISSION_STALE_SECONDS = 180
POLL_MIN_INTERVAL_SECONDS = 12
logger = logging.getLogger(__name__)

# Render's free web service does not provide a separate worker process. Keep
# the submit operation off the request thread while persisting all durable
# state in PostgreSQL. A process restart can interrupt an in-flight submission;
# stale submissions are therefore marked failed for a deliberate safe retry,
# rather than blindly resubmitted and potentially charged twice.
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="meshy-submit")
_submission_lock = threading.Lock()
_inflight_submissions = set()
_refresh_lock = threading.Lock()
_inflight_refreshes = set()


def _api_key():
    key = os.environ.get("MESHY_API_KEY", "").strip()
    if not key:
        raise RuntimeError("MESHY_API_KEY is not configured on the backend.")
    return key


def _headers():
    return {"Authorization": f"Bearer {_api_key()}", "Content-Type": "application/json"}


def _source_images(product):
    images = list(product.images.filter(image__isnull=False).exclude(image=""))
    if not images:
        raise ValueError("Upload at least one product photo before generating a 3D model.")

    # Keep one colourway together; mixing different colours can confuse the model.
    primary = next((item for item in images if item.is_primary), images[0])
    group = [
        item for item in images
        if (item.color or "").strip().lower() == (primary.color or "").strip().lower()
    ]
    rank = {"front": 0, "back": 1, "side": 2, "detail": 3, "other": 4}
    group.sort(key=lambda item: (rank.get(item.view, 5), not item.is_primary, item.order, item.id))

    # Meshy must not need to fetch Render's potentially ephemeral /media URLs.
    # Send up to four source photos directly as data URIs instead.
    data_uris = []
    for item in group[:4]:
        try:
            # FieldFile.open delegates to Django's configured storage backend.
            # This is important on Render, where the local media directory is ephemeral.
            item.image.open("rb")
            try:
                image_bytes = item.image.read()
            finally:
                item.image.close()
        except Exception as exc:
            logger.exception("Unable to read Meshy source image %s for product %s", item.image.name, product.pk)
            raise ValueError(
                f"Cannot access product photo '{item.image.name}' in configured media storage. "
                "Re-upload the photo through the product editor and try again."
            ) from exc

        if not image_bytes:
            raise ValueError(f"Product photo '{item.image.name}' is empty. Re-upload it and try again.")
        if len(image_bytes) > 20 * 1024 * 1024:
            raise ValueError(f"Product photo '{item.image.name}' exceeds Meshy's 20 MB per-image limit.")

        mime_type = mimetypes.guess_type(item.image.name)[0] or "image/jpeg"
        if mime_type not in ("image/jpeg", "image/png", "image/webp"):
            raise ValueError(
                f"Product photo '{item.image.name}' must be JPG, PNG or WebP for Meshy; "
                f"detected {mime_type}."
            )
        encoded = base64.b64encode(image_bytes).decode("ascii")
        data_uris.append(f"data:{mime_type};base64,{encoded}")
    return data_uris


def _save_submission_error(product_id, message):
    Product.objects.filter(pk=product_id).update(
        ar_generation_status=Product.ARGenerationStatus.FAILED,
        ar_generation_error=str(message)[:1000],
        ar_generation_updated_at=timezone.now(),
    )


def _submit_product_generation(product_id):
    """Worker-thread entry point. Saves the Meshy task ID before returning."""
    close_old_connections()
    try:
        product = Product.objects.get(pk=product_id)
        if product.ar_generation_task_id:
            return

        image_urls = _source_images(product)
        payload = {
            "image_urls": image_urls,
            "ai_model": "meshy-7.1",
            "should_texture": True,
            "enable_pbr": True,
            "target_formats": ["glb", "usdz"],
        }
        response = requests.post(
            f"{MESHY_API}/multi-image-to-3d",
            headers=_headers(),
            json=payload,
            timeout=TIMEOUT,
        )
        if not response.ok:
            try:
                body = response.json()
            except ValueError:
                body = response.text
            if isinstance(body, dict):
                detail = body.get("message") or body.get("detail") or body.get("error") or body
            else:
                detail = body
            raise RuntimeError(
                f"Meshy API returned HTTP {response.status_code}: {str(detail).strip()[:700]}"
            )

        try:
            result = response.json()
        except ValueError as exc:
            raise RuntimeError("Meshy returned a response that was not valid JSON.") from exc
        # Meshy may return the task ID as a plain "result" string (task
        # submission response), or return the full task object with "id"
        # (including status/model_urls when the task has already completed).
        task_data = result.get("result") if isinstance(result, dict) else None
        if isinstance(task_data, dict):
            task_id = task_data.get("id") or task_data.get("task_id")
        else:
            task_id = task_data or (result.get("id") or result.get("task_id") if isinstance(result, dict) else None)
        if not task_id:
            raise RuntimeError(f"Meshy did not return a task ID. Response: {str(result)[:500]}")

        # Persist the remote ID immediately. All later requests poll this ID;
        # they never create a second Meshy task while it is present.
        Product.objects.filter(pk=product_id).update(
            ar_generation_task_id=task_id,
            ar_generation_status=Product.ARGenerationStatus.QUEUED,
            ar_generation_error="",
            ar_generation_updated_at=timezone.now(),
        )
        logger.info("Meshy task %s accepted for product %s", task_id, product_id)
    except requests.Timeout:
        message = (
            "Meshy did not return a task ID before the submission timeout. "
            "Check Meshy task history before retrying to avoid duplicate credit usage."
        )
        logger.exception("Meshy submission timed out for product %s", product_id)
        _save_submission_error(product_id, message)
    except Exception as exc:
        logger.exception("Meshy submission failed for product %s: %s", product_id, exc)
        _save_submission_error(product_id, str(exc) or "Unknown Meshy submission error.")
    finally:
        close_old_connections()
        with _submission_lock:
            _inflight_submissions.discard(product_id)


def _queue_submission(product_id):
    """Queue one submission per product in this web process."""
    with _submission_lock:
        if product_id in _inflight_submissions:
            return False
        _inflight_submissions.add(product_id)
    try:
        _executor.submit(_submit_product_generation, product_id)
    except Exception:
        with _submission_lock:
            _inflight_submissions.discard(product_id)
        raise
    return True


def start_product_generation(product, request=None):
    """Persist a submission state and return without waiting for Meshy."""
    # Fail before spending Meshy credits if GitHub is the configured output
    # store but the backend cannot write the resulting GLB/USDZ files.
    if (
        os.environ.get("GITHUB_MEDIA_REPO")
        and not os.environ.get("AWS_STORAGE_BUCKET_NAME")
        and not os.environ.get("GITHUB_MEDIA_TOKEN", "").strip()
    ):
        raise RuntimeError(
            "GITHUB_MEDIA_TOKEN is missing. Add a token with Contents read/write access "
            "to the ml_dataset repository before generating 3D models."
        )
    if product.model_3d and product.ar_generation_status == Product.ARGenerationStatus.SUCCEEDED:
        return {"status": product.ar_generation_status, "detail": "A 3D model is already available."}
    if not product.images.filter(image__isnull=False).exclude(image="").exists():
        raise ValueError("Upload at least one product photo before generating a 3D model.")

    with transaction.atomic():
        current = Product.objects.select_for_update().get(pk=product.pk)
        if current.ar_generation_task_id and current.ar_generation_status in (
            Product.ARGenerationStatus.QUEUED,
            Product.ARGenerationStatus.PROCESSING,
        ):
            return {
                "status": current.ar_generation_status,
                "task_id": current.ar_generation_task_id,
            }

        if current.ar_generation_status == Product.ARGenerationStatus.PROCESSING:
            age = (
                (timezone.now() - current.ar_generation_updated_at).total_seconds()
                if current.ar_generation_updated_at else SUBMISSION_STALE_SECONDS + 1
            )
            if age <= SUBMISSION_STALE_SECONDS:
                return {"status": current.ar_generation_status, "detail": "Submitting task to Meshy."}
            message = (
                "The previous submission did not save a Meshy task ID. "
                "Check Meshy task history before retrying to avoid duplicate credit usage."
            )
            current.ar_generation_status = Product.ARGenerationStatus.FAILED
            current.ar_generation_error = message
            current.ar_generation_updated_at = timezone.now()
            current.save(update_fields=[
                "ar_generation_status", "ar_generation_error", "ar_generation_updated_at",
            ])
            return {"status": current.ar_generation_status, "detail": message}

        current.ar_generation_status = Product.ARGenerationStatus.PROCESSING
        current.ar_generation_task_id = ""
        current.ar_generation_error = ""
        current.ar_generation_updated_at = timezone.now()
        current.save(update_fields=[
            "ar_generation_status", "ar_generation_task_id",
            "ar_generation_error", "ar_generation_updated_at",
        ])

    _queue_submission(product.pk)
    return {"status": Product.ARGenerationStatus.PROCESSING, "detail": "3D generation request queued."}


def _safe_file_url(field):
    """Resolve a generated asset URL without letting a stale remote object 500 status polling."""
    if not field:
        return None
    try:
        return field.url
    except Exception:
        logger.exception("Unable to resolve generated 3D asset URL for %r", getattr(field, "name", None))
        return None


def _download_to_field(field, url, filename):
    if not url:
        return False
    response = requests.get(url, timeout=TIMEOUT)
    response.raise_for_status()
    field.save(filename, ContentFile(response.content), save=False)
    return True


def _refresh_product_generation(product):
    if product.ar_generation_status == Product.ARGenerationStatus.SUCCEEDED:
        return {
            "status": product.ar_generation_status,
            "model_3d_url": _safe_file_url(product.model_3d),
            "model_3d_ios_url": _safe_file_url(product.model_3d_ios),
        }

    if not product.ar_generation_task_id:
        if product.ar_generation_status == Product.ARGenerationStatus.FAILED:
            return {
                "status": product.ar_generation_status,
                "detail": product.ar_generation_error or "Meshy generation failed before a task ID was saved.",
            }
        if product.ar_generation_status == Product.ARGenerationStatus.PROCESSING:
            age = (
                (timezone.now() - product.ar_generation_updated_at).total_seconds()
                if product.ar_generation_updated_at else SUBMISSION_STALE_SECONDS + 1
            )
            if age > SUBMISSION_STALE_SECONDS:
                message = (
                    "The backend submission worker stopped before a Meshy task ID was saved. "
                    "Check Meshy task history before starting another generation."
                )
                _save_submission_error(product.pk, message)
                return {"status": Product.ARGenerationStatus.FAILED, "detail": message}
            return {"status": product.ar_generation_status, "detail": "Submitting task to Meshy."}
        return {
            "status": product.ar_generation_status,
            "detail": "No Meshy task ID is available. Start generation to submit a new task.",
        }

    if product.ar_generation_status in (
        Product.ARGenerationStatus.QUEUED,
        Product.ARGenerationStatus.PROCESSING,
    ):
        elapsed = (
            (timezone.now() - product.ar_generation_updated_at).total_seconds()
            if product.ar_generation_updated_at else POLL_MIN_INTERVAL_SECONDS
        )
        if elapsed < POLL_MIN_INTERVAL_SECONDS:
            return {"status": product.ar_generation_status}

    try:
        response = requests.get(
            f"{MESHY_API}/multi-image-to-3d/{product.ar_generation_task_id}",
            headers=_headers(),
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        task = response.json()
    except requests.RequestException as exc:
        logger.warning("Unable to poll Meshy task for product %s: %s", product.pk, exc)
        raise RuntimeError("Unable to check the Meshy generation task right now.") from exc

    state = str(task.get("status", "")).upper()
    if state in ("PENDING", "IN_PROGRESS", "QUEUED"):
        product.ar_generation_status = Product.ARGenerationStatus.PROCESSING
        product.ar_generation_updated_at = timezone.now()
        product.save(update_fields=["ar_generation_status", "ar_generation_updated_at"])
        return {"status": product.ar_generation_status, "progress": task.get("progress", 0)}

    if state == "SUCCEEDED":
        urls = task.get("model_urls") or {}
        try:
            if not urls.get("glb"):
                raise RuntimeError("Meshy completed the task without a GLB model.")
            _download_to_field(product.model_3d, urls["glb"], f"product-{product.pk}.glb")
            if urls.get("usdz"):
                _download_to_field(product.model_3d_ios, urls["usdz"], f"product-{product.pk}.usdz")
        except requests.RequestException as exc:
            logger.exception("Meshy model download failed for product %s", product.pk)
            raise RuntimeError(
                "Meshy finished, but LarkTribe could not download the generated model files."
            ) from exc

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
            "model_3d_url": _safe_file_url(product.model_3d),
            "model_3d_ios_url": _safe_file_url(product.model_3d_ios),
        }

    if state in ("FAILED", "CANCELED"):
        error = task.get("task_error") or {}
        error_message = error.get("message") if isinstance(error, dict) else str(error)
        product.ar_generation_status = Product.ARGenerationStatus.FAILED
        product.ar_generation_error = str(
            error_message or "Meshy could not generate a model from these photos."
        )[:1000]
        product.ar_generation_updated_at = timezone.now()
        product.save(update_fields=[
            "ar_generation_status", "ar_generation_error", "ar_generation_updated_at",
        ])
        return {"status": product.ar_generation_status, "detail": product.ar_generation_error}

    return {
        "status": product.ar_generation_status,
        "detail": f"Meshy returned an unrecognised task status: {state or 'empty'}.",
    }



def import_completed_meshy_task(product, task_id):
    """Download an already-generated Meshy task and attach it to a product.

    This deliberately does not submit a new generation request or consume
    additional Meshy credits.
    """
    task_id = str(task_id or "").strip()
    if not task_id or len(task_id) > 100:
        raise ValueError("Enter a valid Meshy task ID.")

    response = requests.get(
        f"{MESHY_API}/multi-image-to-3d/{task_id}",
        headers=_headers(),
        timeout=TIMEOUT,
    )
    if not response.ok:
        raise RuntimeError(f"Meshy task lookup failed (HTTP {response.status_code}).")
    try:
        task = response.json()
    except ValueError as exc:
        raise RuntimeError("Meshy returned an invalid task response.") from exc

    state = str(task.get("status", "")).upper()
    if state != "SUCCEEDED":
        if state in ("PENDING", "IN_PROGRESS", "QUEUED"):
            raise ValueError(f"This Meshy task is not finished yet (status: {state}).")
        error = task.get("task_error") or {}
        detail = error.get("message") if isinstance(error, dict) else str(error)
        raise ValueError(detail or f"Meshy task cannot be imported (status: {state or 'unknown'}).")

    urls = task.get("model_urls") or {}
    glb_url = urls.get("glb") or task.get("model_url")
    usdz_url = urls.get("usdz")
    if not glb_url:
        raise RuntimeError("Meshy marked the task successful but did not return a GLB model URL.")

    # Only download signed model assets hosted by Meshy; never accept arbitrary
    # URLs supplied by the admin browser.
    from urllib.parse import urlparse
    for asset_url in (glb_url, usdz_url, task.get("thumbnail_url")):
        if asset_url:
            parsed = urlparse(asset_url)
            if parsed.scheme != "https" or not (parsed.hostname or "").endswith("meshy.ai"):
                raise RuntimeError("Meshy returned an unexpected model asset URL.")

    try:
        with transaction.atomic():
            current = Product.objects.select_for_update().get(pk=product.pk)
            _download_to_field(current.model_3d, glb_url, f"product-{current.pk}.glb")
            if usdz_url:
                _download_to_field(current.model_3d_ios, usdz_url, f"product-{current.pk}.usdz")
            if task.get("thumbnail_url"):
                _download_to_field(
                    current.model_3d_poster,
                    task["thumbnail_url"],
                    f"product-{current.pk}-3d-poster.jpg",
                )
            elif not current.model_3d_poster:
                lead = current.images.filter(is_primary=True).first() or current.images.first()
                if lead and lead.image:
                    current.model_3d_poster = lead.image
            current.ar_generation_task_id = task_id
            current.ar_generation_status = Product.ARGenerationStatus.SUCCEEDED
            current.ar_generation_error = ""
            current.ar_generation_updated_at = timezone.now()
            current.save()
            return {
                "status": current.ar_generation_status,
                "task_id": task_id,
                "model_3d_url": current.model_3d.url if current.model_3d else None,
                "model_3d_ios_url": current.model_3d_ios.url if current.model_3d_ios else None,
            }
    except requests.RequestException as exc:
        logger.exception("Could not download completed Meshy task %s for product %s", task_id, product.pk)
        raise RuntimeError("Meshy has the completed model, but LarkTribe could not download it into media storage.") from exc


def refresh_product_generation(product):
    """Refresh the saved Meshy task status, preventing overlapping polls."""
    if not product.ar_generation_task_id:
        return _refresh_product_generation(product)

    with _refresh_lock:
        if product.pk in _inflight_refreshes:
            return {"status": product.ar_generation_status, "detail": "Checking Meshy task."}
        _inflight_refreshes.add(product.pk)
    try:
        return _refresh_product_generation(product)
    finally:
        with _refresh_lock:
            _inflight_refreshes.discard(product.pk)
