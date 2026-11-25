from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0020_product_model_3d_product_model_3d_poster_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="model_3d_ios",
            field=models.FileField(blank=True, help_text="Generated USDZ model for iOS AR Quick Look.", null=True, upload_to="products/3d/"),
        ),
        migrations.AddField(
            model_name="product",
            name="ar_generation_status",
            field=models.CharField(choices=[("not_started", "Not started"), ("queued", "Queued"), ("processing", "Processing"), ("succeeded", "Succeeded"), ("failed", "Failed")], db_index=True, default="not_started", max_length=20),
        ),
        migrations.AddField(
            model_name="product",
            name="ar_generation_task_id",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="product",
            name="ar_generation_error",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="product",
            name="ar_generation_updated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
