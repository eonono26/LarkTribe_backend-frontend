from django.core.management.base import BaseCommand
from localization.models import Currency, Language


CURRENCIES = [
    # code, name, symbol, rate_to_base (units per 1 KES), is_base, is_default, order
    ("KES", "Kenyan Shilling", "KSh", 1, True, True, 0),
    ("USD", "US Dollar", "$", 0.0067, False, False, 1),
    ("EUR", "Euro", "€", 0.0062, False, False, 2),
    ("GBP", "British Pound", "£", 0.0053, False, False, 3),
    ("NGN", "Nigerian Naira", "₦", 11.9, False, False, 4),
    ("ZAR", "South African Rand", "R", 0.125, False, False, 5),
    ("UGX", "Ugandan Shilling", "USh", 25.3, False, False, 6),
    ("TZS", "Tanzanian Shilling", "TSh", 17.8, False, False, 7),
]

LANGUAGES = [
    # code, name, native_name, flag, is_default, order
    ("en", "English", "English", "🇬🇧", True, 0),
    ("sw", "Swahili", "Kiswahili", "🇰🇪", False, 1),
    ("fr", "French", "Français", "🇫🇷", False, 2),
    ("es", "Spanish", "Español", "🇪🇸", False, 3),
    ("de", "German", "Deutsch", "🇩🇪", False, 4),
    ("it", "Italian", "Italiano", "🇮🇹", False, 5),
    ("pt", "Portuguese", "Português", "🇵🇹", False, 6),
    ("ar", "Arabic", "العربية", "🇸🇦", False, 7),
    ("hi", "Hindi", "हिन्दी", "🇮🇳", False, 8),
    ("zh", "Chinese", "中文", "🇨🇳", False, 9),
    ("ja", "Japanese", "日本語", "🇯🇵", False, 10),
    ("ko", "Korean", "한국어", "🇰🇷", False, 11),
    ("ru", "Russian", "Русский", "🇷🇺", False, 12),
    ("af", "Afrikaans", "Afrikaans", "🇿🇦", False, 13),
    ("am", "Amharic", "አማርኛ", "🇪🇹", False, 14),
]


class Command(BaseCommand):
    help = "Seed (or update) the currencies and languages the storefront can switch between."

    def handle(self, *args, **options):
        for code, name, symbol, rate, is_base, is_default, order in CURRENCIES:
            obj, created = Currency.objects.update_or_create(
                code=code,
                defaults={
                    "name": name, "symbol": symbol, "rate_to_base": rate,
                    "is_base": is_base, "is_default": is_default, "order": order,
                },
            )
            self.stdout.write(f"{'Created' if created else 'Updated'} currency {code}")

        for code, name, native_name, flag, is_default, order in LANGUAGES:
            obj, created = Language.objects.update_or_create(
                code=code,
                defaults={
                    "name": name, "native_name": native_name, "flag": flag,
                    "is_default": is_default, "order": order,
                },
            )
            self.stdout.write(f"{'Created' if created else 'Updated'} language {code}")

        self.stdout.write(self.style.SUCCESS("Localization data seeded."))
