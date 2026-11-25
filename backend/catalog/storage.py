"""Dedicated storage for large product 3D assets.

When AR_STORAGE_BUCKET_NAME is configured, GLB/USDZ/poster files go to an
S3-compatible bucket (Cloudflare R2). Without it, local development falls
back to Django's default storage. Product photos continue using default
storage and are not migrated.
"""
import os

from django.core.files.storage import Storage, default_storage
from django.utils.deconstruct import deconstructible


@deconstructible
class Product3DStorage(Storage):
    """Route only Product 3D assets to R2; preserve default media storage."""

    def __init__(self):
        self._backend = None

    def _get_backend(self):
        if self._backend is None:
            bucket = os.environ.get("AR_STORAGE_BUCKET_NAME", "").strip()
            if not bucket:
                self._backend = default_storage
            else:
                try:
                    from storages.backends.s3 import S3Storage
                except ImportError as exc:
                    raise RuntimeError(
                        "Install django-storages[s3] to use 3D object storage."
                    ) from exc

                endpoint = os.environ.get("AR_STORAGE_ENDPOINT_URL", "").strip()
                custom_domain = os.environ.get("AR_STORAGE_CUSTOM_DOMAIN", "").strip()
                self._backend = S3Storage(
                    bucket_name=bucket,
                    access_key=os.environ.get("AR_STORAGE_ACCESS_KEY_ID", ""),
                    secret_key=os.environ.get("AR_STORAGE_SECRET_ACCESS_KEY", ""),
                    endpoint_url=endpoint or None,
                    region_name=os.environ.get("AR_STORAGE_REGION_NAME", "auto"),
                    default_acl=None,
                    querystring_auth=not bool(custom_domain),
                    querystring_expire=int(os.environ.get("AR_STORAGE_URL_TTL", "3600")),
                    file_overwrite=False,
                    addressing_style="path",
                    custom_domain=custom_domain or None,
                )
        return self._backend

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return getattr(self._get_backend(), name)

    def deconstruct(self):
        return ("catalog.storage.Product3DStorage", [], {})
