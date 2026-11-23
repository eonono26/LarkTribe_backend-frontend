from django.core.management.base import BaseCommand
from django.utils import timezone
from tryon.models import TryOnRequest


class Command(BaseCommand):
    help = "Delete expired, unsaved try-on renders (and any leftover source photos). Run daily."

    def handle(self, *args, **opts):
        qs = TryOnRequest.objects.filter(expires_at__lt=timezone.now(), is_saved=False)
        n = 0
        for req in qs:
            for f in (req.source_photo, req.result_image):
                if f:
                    f.delete(save=False)
            req.delete()
            n += 1
        self.stdout.write(f"Purged {n} expired try-on renders.")
