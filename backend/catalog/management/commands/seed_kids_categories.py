from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Seed the Kids / Babies category tree. Superseded: categories are now ONE "
        "gender-neutral tree (Clothing / Baby Essentials / Footwear & Accessories); "
        "gender and age are filters. This delegates to restructure_kids_baby_categories, "
        "which is idempotent and also migrates any legacy Baby Boys / Girls / Gen Z categories."
    )

    def handle(self, *args, **options):
        call_command("restructure_kids_baby_categories")
