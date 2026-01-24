# Generated manually to properly fix unique phone constraint

from django.db import migrations, models


def fix_empty_phones(apps, schema_editor):
    """Заменяем пустые строки на NULL перед применением unique constraint"""
    Tenant = apps.get_model('core', 'Tenant')
    # Используем raw SQL чтобы обойти валидацию Django
    with schema_editor.connection.cursor() as cursor:
        # Заменяем пустые строки на NULL
        cursor.execute("UPDATE tenants SET phone = NULL WHERE phone = '' OR TRIM(phone) = ''")
        print(f"Updated {cursor.rowcount} records with empty phone to NULL")


def reverse_fix_empty_phones(apps, schema_editor):
    """Обратная операция - заменяем NULL на пустую строку"""
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("UPDATE tenants SET phone = '' WHERE phone IS NULL")


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_fix_unique_phone_nullable'),
    ]

    operations = [
        # Шаг 1: Убираем unique constraint временно
        migrations.AlterField(
            model_name='tenant',
            name='phone',
            field=models.CharField(blank=True, db_index=True, max_length=20, null=True, verbose_name='Телефон'),
        ),
        # Шаг 2: Заменяем пустые строки на NULL
        migrations.RunPython(fix_empty_phones, reverse_fix_empty_phones),
        # Шаг 3: Устанавливаем unique constraint (NULL значения разрешены, но не дублируются)
        migrations.AlterField(
            model_name='tenant',
            name='phone',
            field=models.CharField(blank=True, db_index=True, help_text='Номер телефона должен быть уникальным. Один номер = один контрагент. Может быть пустым.', max_length=20, null=True, unique=True, verbose_name='Телефон'),
        ),
    ]
