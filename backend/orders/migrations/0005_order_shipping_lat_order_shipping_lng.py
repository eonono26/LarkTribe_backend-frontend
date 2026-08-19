from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0004_coupon_is_public"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="shipping_lat",
            field=models.DecimalField(blank=True, decimal_places=6, help_text="Dropoff coordinate captured from the delivery location picker at checkout.", max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="shipping_lng",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
    ]
