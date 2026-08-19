from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Currency",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(help_text="ISO 4217 code, e.g. KES, USD.", max_length=3, unique=True)),
                ("name", models.CharField(help_text="e.g. Kenyan Shilling", max_length=50)),
                ("symbol", models.CharField(help_text="e.g. KSh, $, \u20ac", max_length=5)),
                ("rate_to_base", models.DecimalField(decimal_places=6, default=1, help_text="Units of this currency per 1 unit of the base currency (KES). Base currency itself is 1.", max_digits=14)),
                ("is_base", models.BooleanField(default=False, help_text="The currency product prices are stored in. Only one currency should have this set.")),
                ("is_active", models.BooleanField(default=True, help_text="Whether shoppers can select this currency.")),
                ("is_default", models.BooleanField(default=False, help_text="Pre-selected currency for new/guest visitors.")),
                ("order", models.PositiveIntegerField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name_plural": "currencies",
                "ordering": ["order", "code"],
            },
        ),
        migrations.CreateModel(
            name="Language",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(help_text="e.g. en, sw, fr", max_length=5, unique=True)),
                ("name", models.CharField(help_text="English label, e.g. Swahili", max_length=50)),
                ("native_name", models.CharField(help_text="e.g. Kiswahili", max_length=50)),
                ("flag", models.CharField(blank=True, help_text="Emoji flag shown in the switcher.", max_length=8)),
                ("is_active", models.BooleanField(default=True, help_text="Whether shoppers can select this language.")),
                ("is_default", models.BooleanField(default=False, help_text="Pre-selected language for new/guest visitors.")),
                ("order", models.PositiveIntegerField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["order", "code"],
            },
        ),
    ]
