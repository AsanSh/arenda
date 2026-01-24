# Generated manually to properly add unique phone constraint

from django.db import migrations, models


def fix_empty_phones_before_unique(apps, schema_editor):
    """Заменяем пустые строки на NULL перед применением unique constraint"""
    with schema_editor.connection.cursor() as cursor:
        # Сначала убираем NOT NULL constraint если есть
        try:
            cursor.execute("ALTER TABLE tenants ALTER COLUMN phone DROP NOT NULL")
        except Exception:
            pass  # Constraint может не существовать
        
        # Заменяем пустые строки на NULL
        cursor.execute("UPDATE tenants SET phone = NULL WHERE phone = '' OR TRIM(phone) = ''")
        print(f"Updated {cursor.rowcount} records with empty phone to NULL")


def reverse_fix_empty_phones(apps, schema_editor):
    """Обратная операция"""
    pass  # Не нужно ничего делать при откате


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_add_admin_type_to_tenant'),
    ]

    operations = [
        # Шаг 1: Убираем NOT NULL constraint и делаем поле nullable
        migrations.AlterField(
            model_name='tenant',
            name='phone',
            field=models.CharField(blank=True, max_length=20, null=True, verbose_name='Телефон'),
        ),
        # Шаг 2: Заменяем пустые строки на NULL
        migrations.RunPython(fix_empty_phones_before_unique, reverse_fix_empty_phones),
        # Шаг 3: Добавляем unique constraint и index
        migrations.AlterField(
            model_name='tenant',
            name='phone',
            field=models.CharField(blank=True, db_index=True, help_text='Номер телефона должен быть уникальным. Один номер = один контрагент. Может быть пустым.', max_length=20, null=True, unique=True, verbose_name='Телефон'),
        ),
    ]
