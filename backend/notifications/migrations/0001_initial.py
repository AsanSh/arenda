from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('accruals', '0001_initial'),
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='NotificationSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_type', models.CharField(choices=[('email', 'Email'), ('sms', 'SMS')], default='email', max_length=10, verbose_name='Тип уведомления')),
                ('days_before', models.IntegerField(default=3, help_text='За сколько дней до срока оплаты отправлять уведомление', verbose_name='Дней до срока оплаты')),
                ('message_template', models.TextField(default='Уважаемый {tenant_name}!\\n\\nНапоминаем, что срок оплаты начисления по договору {contract_number} наступает {due_date}.\\nСумма к оплате: {amount} {currency}.\\n\\nС уважением, Команда ZAKUP.ONE', help_text='Используйте переменные: {tenant_name}, {contract_number}, {due_date}, {amount}, {currency}, {property_name}, {property_address}', verbose_name='Шаблон сообщения')),
                ('is_enabled', models.BooleanField(default=True, verbose_name='Включена рассылка')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Настройки уведомлений',
                'verbose_name_plural': 'Настройки уведомлений',
                'db_table': 'notification_settings',
            },
        ),
        migrations.CreateModel(
            name='NotificationLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_type', models.CharField(choices=[('email', 'Email'), ('sms', 'SMS')], max_length=10, verbose_name='Тип уведомления')),
                ('recipient', models.CharField(help_text='Email или телефон', max_length=255, verbose_name='Получатель')),
                ('message', models.TextField(verbose_name='Сообщение')),
                ('status', models.CharField(choices=[('sent', 'Отправлено'), ('failed', 'Ошибка'), ('skipped', 'Пропущено')], default='sent', max_length=10, verbose_name='Статус')),
                ('error_message', models.TextField(blank=True, verbose_name='Сообщение об ошибке')),
                ('sent_at', models.DateTimeField(auto_now_add=True, verbose_name='Отправлено')),
                ('accrual', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notification_logs', to='accruals.accrual', verbose_name='Начисление')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notification_logs', to='core.tenant', verbose_name='Контрагент')),
            ],
            options={
                'verbose_name': 'Лог уведомления',
                'verbose_name_plural': 'Логи уведомлений',
                'db_table': 'notification_logs',
                'ordering': ['-sent_at'],
            },
        ),
        migrations.AddIndex(
            model_name='notificationlog',
            index=models.Index(fields=['accrual', 'status'], name='notification_accrual_idx'),
        ),
        migrations.AddIndex(
            model_name='notificationlog',
            index=models.Index(fields=['tenant', 'sent_at'], name='notification_tenant_idx'),
        ),
    ]
