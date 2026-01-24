# Generated migration for LoginAttempt model

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_alter_user_options_user_counterparty_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='LoginAttempt',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('attempt_id', models.CharField(db_index=True, max_length=64, unique=True, verbose_name='ID попытки')),
                ('status', models.CharField(choices=[('NEW', 'Новая'), ('VERIFIED', 'Подтверждена'), ('COMPLETED', 'Завершена'), ('FAILED', 'Ошибка')], db_index=True, default='NEW', max_length=20, verbose_name='Статус')),
                ('failure_reason', models.CharField(blank=True, choices=[('ATTEMPT_EXPIRED', 'Попытка истекла'), ('PHONE_NOT_UNIQUE', 'Номер привязан к нескольким аккаунтам'), ('USER_NOT_FOUND', 'Номер не зарегистрирован'), ('PARSE_FAILED', 'Ошибка парсинга сообщения')], max_length=30, null=True, verbose_name='Причина ошибки')),
                ('verified_phone', models.CharField(blank=True, db_index=True, max_length=20, null=True, verbose_name='Подтвержденный телефон')),
                ('expected_phone', models.CharField(blank=True, max_length=20, null=True, verbose_name='Ожидаемый телефон')),
                ('metadata', models.JSONField(blank=True, default=dict, verbose_name='Метаданные')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='Создано')),
                ('expires_at', models.DateTimeField(db_index=True, verbose_name='Истекает')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Обновлено')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='login_attempts', to='core.user', verbose_name='Пользователь')),
            ],
            options={
                'verbose_name': 'Попытка входа',
                'verbose_name_plural': 'Попытки входа',
                'db_table': 'login_attempts',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='loginattempt',
            index=models.Index(fields=['attempt_id', 'status'], name='login_atte_attempt_2b3c4d_idx'),
        ),
        migrations.AddIndex(
            model_name='loginattempt',
            index=models.Index(fields=['status', 'expires_at'], name='login_atte_status_5a8f2e_idx'),
        ),
        migrations.AddIndex(
            model_name='loginattempt',
            index=models.Index(fields=['verified_phone', 'status'], name='login_atte_verifie_8d9c1f_idx'),
        ),
    ]
