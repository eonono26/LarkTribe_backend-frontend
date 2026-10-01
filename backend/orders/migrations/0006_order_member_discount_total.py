from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0005_order_shipping_lat_order_shipping_lng"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="member_discount_total",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text="5% member discount applied because the order was placed while signed in, on top of any coupon.",
                max_digits=10,
            ),
        ),
    ]
