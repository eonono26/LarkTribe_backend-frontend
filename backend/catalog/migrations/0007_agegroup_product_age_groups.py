import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0006_alter_departmentmedia_file"),
    ]

    operations = [
        migrations.CreateModel(
            name="AgeGroup",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=50, unique=True)),
                ("slug", models.SlugField(blank=True, unique=True)),
                ("min_age_years", models.DecimalField(blank=True, decimal_places=1, help_text="Lower bound in years, e.g. 0 for Baby.", max_digits=4, null=True)),
                ("max_age_years", models.DecimalField(blank=True, decimal_places=1, help_text="Upper bound in years, blank = no upper limit.", max_digits=4, null=True)),
                ("icon", models.CharField(blank=True, help_text="Emoji shown in the age-group nav, e.g. \U0001f37c", max_length=8)),
                ("order", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["order"],
            },
        ),
        migrations.AddField(
            model_name="product",
            name="age_groups",
            field=models.ManyToManyField(blank=True, help_text="Who this product is for, e.g. Kids, Teens, Baby. Independent of the department/category.", related_name="products", to="catalog.agegroup"),
        ),
    ]
