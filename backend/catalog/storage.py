"""Shared Cloudflare R2 storage with a temporary GitHub-media read fallback.

New uploads go to R2. Existing files are served from GitHub until the
migrate_media_to_r2 management command copies them into the same R2 keys.
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

    def exists(self, name):
        """Delegate existence checks to the configured underlying storage."""
        return self._get_backend().exists(name)

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return getattr(self._get_backend(), name)

    def deconstruct(self):
        return ("catalog.storage.Product3DStorage", [], {})



@deconstructible
class UnifiedMediaStorage(Storage):
    """Write all new media to R2; read legacy GitHub objects until migrated."""

    def __init__(self):
        self._r2 = None
        self._legacy = None

    def _get_r2(self):
        if self._r2 is None:
            from storages.backends.s3 import S3Storage

            bucket = os.environ.get("AR_STORAGE_BUCKET_NAME", "").strip()
            if not bucket:
                raise RuntimeError("AR_STORAGE_BUCKET_NAME is required for R2 media storage.")
            custom_domain = os.environ.get("AR_STORAGE_CUSTOM_DOMAIN", "").strip()
            self._r2 = S3Storage(
                bucket_name=bucket,
                access_key=os.environ.get("AR_STORAGE_ACCESS_KEY_ID", ""),
                secret_key=os.environ.get("AR_STORAGE_SECRET_ACCESS_KEY", ""),
                endpoint_url=os.environ.get("AR_STORAGE_ENDPOINT_URL") or None,
                region_name=os.environ.get("AR_STORAGE_REGION_NAME", "auto"),
                default_acl=None,
                querystring_auth=not bool(custom_domain),
                querystring_expire=int(os.environ.get("AR_STORAGE_URL_TTL", "3600")),
                file_overwrite=False,
                addressing_style="path",
                custom_domain=custom_domain or None,
            )
        return self._r2

    def _get_legacy(self):
        if self._legacy is None:
            from catalog.github_storage import GitHubMediaStorage
            self._legacy = GitHubMediaStorage()
        return self._legacy

    def _open(self, name, mode="rb"):
        r2 = self._get_r2()
        if r2.exists(name):
            return r2.open(name, mode)
        return self._get_legacy().open(name, mode)

    def _save(self, name, content):
        return self._get_r2().save(name, content)

    def exists(self, name):
        if self._get_r2().exists(name):
            return True
        return self._get_legacy().exists(name)

    def url(self, name):
        r2 = self._get_r2()
        if r2.exists(name):
            return r2.url(name)
        return self._get_legacy().url(name)

    def size(self, name):
        r2 = self._get_r2()
        if r2.exists(name):
            return r2.size(name)
        return self._get_legacy().size(name)

    def delete(self, name):
        self._get_r2().delete(name)
        self._get_legacy().delete(name)

    def deconstruct(self):
        return ("catalog.storage.UnifiedMediaStorage", [], {})
