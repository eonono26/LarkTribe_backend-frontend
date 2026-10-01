from django.db import migrations


class Migration(migrations.Migration):
    """
    AgeGroup.gender was added in 0011/0012 but contradicts the intended
    architecture: AgeGroup is age-only, gender lives on Product.gender.
    Nothing seeds this field to anything but the 'unisex' default, so it's
    safe to drop with no data-migration step needed.
    """

    dependencies = [
        ('catalog', '0012_alter_agegroup_unique_together_alter_agegroup_gender_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='agegroup',
            name='gender',
        ),
        migrations.AlterModelOptions(
            name='agegroup',
            options={'ordering': ['order']},
        ),
    ]
