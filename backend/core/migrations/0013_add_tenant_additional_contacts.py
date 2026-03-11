# Generated manually
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0012_add_audit_log'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenant',
            name='additional_contacts',
            field=models.JSONField(blank=True, default=list, help_text='Список {name, phone}', verbose_name='Доп. контактные лица'),
        ),
    ]
