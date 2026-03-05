# Generated manually for sync with existing DB column

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('properties', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='property',
            name='in_collateral',
            field=models.BooleanField(default=False, verbose_name='В залоге'),
        ),
    ]
