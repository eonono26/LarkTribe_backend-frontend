"""
Virtual try-on engine (proposal item 1).

The AI provider has not been chosen yet (it needs a technical + privacy
review), so this module is a thin, provider-agnostic adapter:

* TRYON_PROVIDER unset / "" / "none"  -> NotConfigured (the API answers 503 and
  the clients show the "pilot not enabled yet" state).
* TRYON_PROVIDER = "http"             -> POST the shopper photo + garment photo
  to TRYON_API_URL (multipart, Bearer TRYON_API_KEY) and expect either raw
  image bytes or JSON {"image_url": "..."} / {"image_base64": "..."} back.
  Most hosted try-on APIs can be put behind such a small gateway.

Shopper photos are processed in memory only; nothing here writes them to disk.
"""
import base64
import io
import os

import requests
from PIL import Image, UnidentifiedImageError

MAX_PHOTO_BYTES = 10 * 1024 * 1024
MAX_SIDE = 1800
TIMEOUT_SECONDS = 90


class NotConfigured(Exception):
    pass


class InvalidPhoto(Exception):
    pass


class ProviderError(Exception):
    pass


def is_configured() -> bool:
    return os.environ.get("TRYON_PROVIDER", "").strip().lower() in {"http"} and bool(
        os.environ.get("TRYON_API_URL", "").strip()
    )


def normalise_photo(raw: bytes) -> bytes:
    """Validate it is a real image, strip EXIF/metadata and cap the size."""
    if not raw:
        raise InvalidPhoto("No photo received.")
    if len(raw) > MAX_PHOTO_BYTES:
        raise InvalidPhoto("Choose an image smaller than 10 MB.")
    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except (UnidentifiedImageError, OSError):
        raise InvalidPhoto("That file is not a usable image.")
    img = img.convert("RGB")
    img.thumbnail((MAX_SIDE, MAX_SIDE))
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=88)  # re-encoding drops EXIF/GPS data
    return out.getvalue()


def generate(person_jpeg: bytes, garment_bytes: bytes, garment_name: str = "") -> bytes:
    """Return the generated try-on image (JPEG/PNG bytes)."""
    if not is_configured():
        raise NotConfigured("AI try-on is not enabled yet.")

    url = os.environ["TRYON_API_URL"].strip()
    headers = {}
    key = os.environ.get("TRYON_API_KEY", "").strip()
    if key:
        headers["Authorization"] = f"Bearer {key}"
    try:
        resp = requests.post(
            url,
            headers=headers,
            files={
                "person": ("person.jpg", person_jpeg, "image/jpeg"),
                "garment": ("garment.jpg", garment_bytes, "application/octet-stream"),
            },
            data={"garment_name": garment_name},
            timeout=TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise ProviderError("The try-on service could not be reached.") from exc
    if resp.status_code >= 400:
        raise ProviderError("The try-on service could not process this photo.")

    ctype = resp.headers.get("Content-Type", "")
    if ctype.startswith("image/"):
        return resp.content
    try:
        payload = resp.json()
    except ValueError as exc:
        raise ProviderError("Unexpected response from the try-on service.") from exc
    if payload.get("image_base64"):
        return base64.b64decode(payload["image_base64"])
    if payload.get("image_url"):
        try:
            img = requests.get(payload["image_url"], timeout=TIMEOUT_SECONDS)
            img.raise_for_status()
        except requests.RequestException as exc:
            raise ProviderError("Could not fetch the generated preview.") from exc
        return img.content
    raise ProviderError("The try-on service returned no image.")
