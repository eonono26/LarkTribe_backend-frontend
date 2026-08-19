from django.db import models


class Currency(models.Model):
    """A currency the storefront can display prices in. All product prices are
    stored in the base currency (KES) in catalog.Product.price — everything else
    is converted on the fly using rate_to_base, so changing a rate here instantly
    changes every displayed price without touching product records."""

    code = models.CharField(max_length=3, unique=True, help_text="ISO 4217 code, e.g. KES, USD.")
    name = models.CharField(max_length=50, help_text="e.g. Kenyan Shilling")
    symbol = models.CharField(max_length=5, help_text="e.g. KSh, $, €")
    rate_to_base = models.DecimalField(
        max_digits=14, decimal_places=6, default=1,
        help_text="Units of this currency per 1 unit of the base currency (KES). Base currency itself is 1.",
    )
    is_base = models.BooleanField(default=False, help_text="The currency product prices are stored in. Only one currency should have this set.")
    is_active = models.BooleanField(default=True, help_text="Whether shoppers can select this currency.")
    is_default = models.BooleanField(default=False, help_text="Pre-selected currency for new/guest visitors.")
    order = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "code"]
        verbose_name_plural = "currencies"

    def __str__(self):
        return self.code

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_default:
            Currency.objects.filter(is_default=True).exclude(pk=self.pk).update(is_default=False)
        if self.is_base:
            Currency.objects.filter(is_base=True).exclude(pk=self.pk).update(is_base=False)


class Language(models.Model):
    """A language the storefront UI can be shown in."""

    code = models.CharField(max_length=5, unique=True, help_text="e.g. en, sw, fr")
    name = models.CharField(max_length=50, help_text="English label, e.g. Swahili")
    native_name = models.CharField(max_length=50, help_text="e.g. Kiswahili")
    flag = models.CharField(max_length=8, blank=True, help_text="Emoji flag shown in the switcher.")
    is_active = models.BooleanField(default=True, help_text="Whether shoppers can select this language.")
    is_default = models.BooleanField(default=False, help_text="Pre-selected language for new/guest visitors.")
    order = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "code"]

    def __str__(self):
        return self.code

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_default:
            Language.objects.filter(is_default=True).exclude(pk=self.pk).update(is_default=False)
