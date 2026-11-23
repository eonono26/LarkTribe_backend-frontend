"""Try-on providers. Each takes the shopper photo bytes + garment images and
returns PNG/JPEG bytes. Swap provider with TRYON_PROVIDER; the rest of the app
never touches provider specifics."""
import base64
import io
import logging
import mimetypes

import requests
from django.conf import settings
from PIL import Image, ImageDraw

logger = logging.getLogger(__name__)


class TryOnError(Exception):
    """User-safe failure message."""


def _mime(data: bytes) -> str:
    try:
        fmt = (Image.open(io.BytesIO(data)).format or "JPEG").lower()
    except Exception:
        fmt = "jpeg"
    return mimetypes.types_map.get("." + fmt, "image/jpeg")


def _prompt(names, color):
    garments = ", ".join(names)
    colour_note = f" in {color}" if color else ""
    return (
        "Virtual try-on. The first image is a photo of a real person. The following image(s) are the "
        f"exact garment product photos ({garments}{colour_note}). Dress the person in the garment(s) so it "
        "looks like a real photograph of them wearing it: keep their face, hair, skin tone, body shape, pose, "
        "background and lighting unchanged; reproduce the garment's exact colour, print, cut and details from the "
        "product photo; fit it naturally with realistic folds and shadows. Replace only the clothing the new garment "
        "covers. Output a single photorealistic image of the same person, same framing. No text, no watermark."
    )


def gemini_render(person: bytes, garments: list, names: list, color: str) -> bytes:
    if not settings.GEMINI_API_KEY:
        raise TryOnError("Virtual try-on is not configured yet.")
    parts = [{"text": _prompt(names, color)}, {"inline_data": {"mime_type": _mime(person), "data": base64.b64encode(person).decode()}}]
    for g in garments:
        parts.append({"inline_data": {"mime_type": _mime(g), "data": base64.b64encode(g).decode()}})
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.TRYON_GEMINI_MODEL}:generateContent"
    try:
        res = requests.post(
            url, headers={"x-goog-api-key": settings.GEMINI_API_KEY, "Content-Type": "application/json"},
            json={"contents": [{"parts": parts}], "generationConfig": {"responseModalities": ["IMAGE"]}}, timeout=90,
        )
    except requests.RequestException:
        logger.exception("Gemini try-on request failed")
        raise TryOnError("The try-on service is unreachable. Please try again.")
    if res.status_code != 200:
        logger.error("Gemini try-on %s: %s", res.status_code, res.text[:400])
        raise TryOnError("The try-on service couldn't process this photo. Try a clearer, full-body photo.")
    try:
        for cand in res.json().get("candidates", []):
            for part in cand.get("content", {}).get("parts", []):
                inline = part.get("inlineData") or part.get("inline_data")
                if inline and inline.get("data"):
                    return base64.b64decode(inline["data"])
    except Exception:
        logger.exception("Gemini try-on response parse failed")
    raise TryOnError("No preview was generated. Try a different photo.")


def mock_render(person: bytes, garments: list, names: list, color: str) -> bytes:
    """Dev-only: overlays the garment on the torso area so the whole flow can be
    exercised without an API key. Clearly watermarked as a preview."""
    base = Image.open(io.BytesIO(person)).convert("RGB")
    base.thumbnail((1024, 1024))
    w, h = base.size
    if garments:
        g = Image.open(io.BytesIO(garments[0])).convert("RGBA")
        gw = int(w * 0.62)
        g = g.resize((gw, int(g.height * gw / g.width)))
        base.paste(g, ((w - gw) // 2, int(h * 0.22)), g)
    d = ImageDraw.Draw(base)
    d.rectangle([0, h - 30, w, h], fill=(18, 18, 18))
    d.text((10, h - 22), "PREVIEW - configure GEMINI_API_KEY for photoreal try-on", fill=(255, 255, 255))
    out = io.BytesIO()
    base.save(out, "JPEG", quality=88)
    return out.getvalue()


def render(person, garments, names, color):
    if settings.TRYON_PROVIDER == "gemini":
        return gemini_render(person, garments, names, color)
    return mock_render(person, garments, names, color)
