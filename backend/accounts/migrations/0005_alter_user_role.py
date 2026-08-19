from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_user_preferred_currency_user_preferred_language"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[("customer", "Customer"), ("vendor", "Vendor"), ("driver", "Driver"), ("admin", "Admin")],
                default="customer",
                max_length=20,
            ),
        ),
    ]
