from django.db import migrations, models
import catalog.storage


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0021_product_meshy_generation"),
    ]

    operations = [
        migrations.AlterField(
            model_name="product",
            name="model_3d",
            field=models.FileField(
                blank=True,
                help_text="Optional .glb / .gltf 3D model shown in the interactive 3D viewer.",
                null=True,
                storage=catalog.storage.Product3DStorage(),
                upload_to="products/3d/",
            ),
        ),
        migrations.AlterField(
            model_name="product",
            name="model_3d_poster",
            field=models.ImageField(
                blank=True,
                help_text="Static fallback image shown while the 3D model loads, or on devices that cannot render it.",
                null=True,
                storage=catalog.storage.Product3DStorage(),
                upload_to="products/3d/",
            ),
        ),
        migrations.AlterField(
            model_name="product",
            name="model_3d_ios",
            field=models.FileField(
                blank=True,
                help_text="Generated USDZ model for iOS AR Quick Look.",
                null=True,
                storage=catalog.storage.Product3DStorage(),
                upload_to="products/3d/",
            ),
        ),
    ]
