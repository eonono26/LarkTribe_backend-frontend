"""Copy database-referenced media from legacy GitHub storage into Cloudflare R2.

Run once before switching Django's default media storage to R2:
    python manage.py migrate_media_to_r2

Safe to re-run: objects already present in R2 are skipped.
"""
import os

from django.apps import apps
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Copy all legacy GitHub-backed model media into the configured Cloudflare R2 bucket."

    def handle(self, *args, **options):
        required = (
            "AR_STORAGE_BUCKET_NAME",
            "AR_STORAGE_ENDPOINT_URL",
            "AR_STORAGE_ACCESS_KEY_ID",
            "AR_STORAGE_SECRET_ACCESS_KEY",
        )
        missing = [key for key in required if not os.environ.get(key, "").strip()]
        if missing:
            raise CommandError("Missing R2 environment variables: " + ", ".join(missing))

        try:
            from storages.backends.s3 import S3Storage
            from catalog.github_storage import GitHubMediaStorage
            from catalog.storage import Product3DStorage
        except ImportError as exc:
            raise CommandError("Install django-storages[s3] before running this command.") from exc

        source = GitHubMediaStorage()
        if not source.configured:
            raise CommandError(
                "GitHub source storage is not configured. Check GITHUB_MEDIA_OWNER, "
                "GITHUB_MEDIA_REPO, GITHUB_MEDIA_BRANCH and GITHUB_MEDIA_TOKEN."
            )

        destination = S3Storage(
            bucket_name=os.environ["AR_STORAGE_BUCKET_NAME"].strip(),
            access_key=os.environ["AR_STORAGE_ACCESS_KEY_ID"].strip(),
            secret_key=os.environ["AR_STORAGE_SECRET_ACCESS_KEY"].strip(),
            endpoint_url=os.environ["AR_STORAGE_ENDPOINT_URL"].strip(),
            region_name=os.environ.get("AR_STORAGE_REGION_NAME", "auto"),
            default_acl=None,
            querystring_auth=False,
            file_overwrite=True,
            addressing_style="path",
        )

        copied = skipped = failed = 0
        seen = set()
        for model in apps.get_models():
            for field in model._meta.get_fields():
                if not getattr(field, "concrete", False):
                    continue
                if getattr(field, "get_internal_type", lambda: "")() not in ("FileField", "ImageField"):
                    continue
                if isinstance(getattr(field, "storage", None), Product3DStorage):
                    continue

                try:
                    queryset = model._default_manager.exclude(
                        **{field.name: ""}
                    ).exclude(**{f"{field.name}__isnull": True})
                    for record in queryset.iterator(chunk_size=100):
                        file_value = getattr(record, field.name, None)
                        name = getattr(file_value, "name", "") if file_value else ""
                        if not name or name in seen:
                            continue
                        seen.add(name)
                        try:
                            if destination.exists(name):
                                skipped += 1
                                continue
                            with source.open(name, "rb") as source_file:
                                destination.save(name, source_file, max_length=field.max_length)
                            if not destination.exists(name):
                                raise RuntimeError("R2 verification failed after upload.")
                            copied += 1
                            self.stdout.write(f"Copied {name}")
                        except Exception as exc:
                            failed += 1
                            self.stderr.write(self.style.ERROR(f"FAILED {name}: {exc}"))
                except Exception as exc:
                    failed += 1
                    self.stderr.write(self.style.ERROR(
                        f"Could not scan {model._meta.label}.{field.name}: {exc}"
                    ))

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"Finished. Copied: {copied}; already in R2: {skipped}; failures: {failed}."
        ))
        if failed:
            raise CommandError("Some media files were not migrated. Do not switch storage yet.")
