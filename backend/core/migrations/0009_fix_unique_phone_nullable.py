# Generated manually to fix unique phone constraint

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_add_unique_phone_to_tenant'),
    ]

    operations = [
        # Шаг 1: Убираем unique constraint временно
        migrations.AlterField(
            model_name='tenant',
            name='phone',
            field=models.CharField(blank=True, db_index=True, max_length=20, null=True, verbose_name='Телефон'),
        ),
        # Шаг 2: Заменяем пустые строки на уникальные значения
        migrations.RunSQL(
            sql="UPDATE tenants SET phone = CONCAT('TEMP_', id::text) WHERE phone = '' OR phone IS NULL;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        # Шаг 3: Устанавливаем unique constraint
        migrations.AlterField(
            model_name='tenant',
            name='phone',
            field=models.CharField(blank=True, db_index=True, help_text='Номер телефона должен быть уникальным. Один номер = один контрагент. Может быть пустым.', max_length=20, null=True, unique=True, verbose_name='Телефон'),
        ),
        # Шаг 4: Возвращаем NULL для временных значений (которые не являются реальными номерами)
        migrations.RunSQL(
            sql="UPDATE tenants SET phone = NULL WHERE phone LIKE 'TEMP_%';",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
