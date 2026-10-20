from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("orders", "0007_orderitem_variant_orderitem_variant_label")]

    operations = [
        migrations.AddField(
            model_name="order",
            name="mpesa_checkout_request_id",
            field=models.CharField(blank=True, db_index=True, max_length=128),
        ),
        migrations.AddField(
            model_name="order",
            name="mpesa_merchant_request_id",
            field=models.CharField(blank=True, max_length=128),
        ),
        migrations.AddField(
            model_name="order",
            name="mpesa_phone",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="order",
            name="mpesa_result_desc",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
