import time
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import close_old_connections
from django.utils import timezone

from catalog.models import Product
from catalog.meshy import submit_product_generation, refresh_product_generation


class Command(BaseCommand):
    help = "Submit and poll queued Meshy 3D-generation jobs."

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true", help="Process one queue pass and exit.")
        parser.add_argument("--interval", type=int, default=10, help="Polling interval in seconds.")

    def handle(self, *args, **options):
        interval = max(5, options["interval"])
        self.stdout.write(self.style.SUCCESS("Meshy background worker started."))
        while True:
            close_old_connections()
            try:
                pending = Product.objects.filter(
                    ar_generation_status=Product.ARGenerationStatus.QUEUED,
                    ar_generation_task_id="",
                ).order_by("ar_generation_updated_at", "id")[:10]
                for product in pending:
                    try:
                        submit_product_generation(product)
                        self.stdout.write(f"Submitted product {product.pk} to Meshy.")
                    except Exception as exc:
                        self.stderr.write(f"Submission failed for product {product.pk}: {exc}")

                cutoff = timezone.now() - timedelta(seconds=12)
                active = Product.objects.filter(
                    ar_generation_status__in=[
                        Product.ARGenerationStatus.QUEUED,
                        Product.ARGenerationStatus.PROCESSING,
                    ],
                    ar_generation_task_id__gt="",
                    ar_generation_updated_at__lt=cutoff,
                ).order_by("ar_generation_updated_at")[:20]
                for product in active:
                    try:
                        refresh_product_generation(product)
                    except Exception as exc:
                        self.stderr.write(f"Status check failed for product {product.pk}: {exc}")
            finally:
                close_old_connections()

            if options["once"]:
                break
            time.sleep(interval)
