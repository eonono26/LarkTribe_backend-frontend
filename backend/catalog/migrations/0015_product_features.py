from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0014_alter_agegroup_options_alter_category_options_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="features",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text=(
                    "Short bullet-point features shown on the product page "
                    'below the description, e.g. ["100% cotton", "Machine '
                    'washable", "Reinforced knees"].'
                ),
            ),
        ),
    ]
