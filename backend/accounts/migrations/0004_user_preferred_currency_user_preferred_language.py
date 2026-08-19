from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_address_paymentmethod"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="preferred_currency",
            field=models.CharField(default="KES", help_text="Storefront currency code, e.g. KES, USD.", max_length=3),
        ),
        migrations.AddField(
            model_name="user",
            name="preferred_language",
            field=models.CharField(default="en", help_text="Storefront language code, e.g. en, sw.", max_length=5),
        ),
    ]
