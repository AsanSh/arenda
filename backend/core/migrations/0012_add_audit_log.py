# Generated manually for AuditLog model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_normalize_phone_numbers'),
    ]

    operations = [
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('profile_updated', 'Изменён профиль'), ('password_changed', 'Сменён пароль'), ('employee_created', 'Добавлен сотрудник'), ('employee_updated', 'Изменён сотрудник'), ('employee_deleted', 'Удалён сотрудник')], db_index=True, max_length=32, verbose_name='Действие')),
                ('target_model', models.CharField(db_index=True, max_length=32, verbose_name='Объект')),
                ('target_id', models.CharField(blank=True, db_index=True, max_length=64, null=True, verbose_name='ID объекта')),
                ('target_repr', models.CharField(blank=True, max_length=255, verbose_name='Название объекта')),
                ('old_data', models.JSONField(blank=True, default=dict, verbose_name='Было (для восстановления)')),
                ('new_data', models.JSONField(blank=True, default=dict, verbose_name='Стало')),
                ('reason', models.CharField(blank=True, max_length=255, verbose_name='Причина/комментарий')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='Когда')),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_logs', to=settings.AUTH_USER_MODEL, verbose_name='Кто изменил')),
            ],
            options={
                'verbose_name': 'Запись лога',
                'verbose_name_plural': 'Логи изменений',
                'db_table': 'audit_logs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['target_model', 'created_at'], name='audit_logs_target__a0e0b4_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['user', 'created_at'], name='audit_logs_user_id_8c2f1a_idx'),
        ),
    ]
