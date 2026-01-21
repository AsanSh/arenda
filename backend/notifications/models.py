from django.db import models
from django.utils import timezone
from datetime import timedelta


class NotificationSettings(models.Model):
    """Настройки рассылки уведомлений"""
    NOTIFICATION_TYPE_CHOICES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
    ]
    
    # Тип уведомления (email или sms)
    notification_type = models.CharField(
        max_length=10,
        choices=NOTIFICATION_TYPE_CHOICES,
        default='email',
        verbose_name='Тип уведомления'
    )
    
    # За сколько дней до срока оплаты отправлять уведомление
    days_before = models.IntegerField(
        default=3,
        verbose_name='Дней до срока оплаты',
        help_text='За сколько дней до срока оплаты отправлять уведомление'
    )
    
    # Текст уведомления
    message_template = models.TextField(
        default='Уважаемый {tenant_name}!\n\nНапоминаем, что срок оплаты начисления по договору {contract_number} наступает {due_date}.\nСумма к оплате: {amount} {currency}.\n\nС уважением, Команда ZAKUP.ONE',
        verbose_name='Шаблон сообщения',
        help_text='Используйте переменные: {tenant_name}, {contract_number}, {due_date}, {amount}, {currency}, {property_name}, {property_address}'
    )
    
    # Включена ли рассылка
    is_enabled = models.BooleanField(
        default=True,
        verbose_name='Включена рассылка'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notification_settings'
        verbose_name = 'Настройки уведомлений'
        verbose_name_plural = 'Настройки уведомлений'
    
    def __str__(self):
        return f'Настройки ({self.get_notification_type_display()})'
    
    @classmethod
    def get_settings(cls):
        """Получить текущие настройки (singleton)"""
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings


class NotificationLog(models.Model):
    """Лог отправленных уведомлений"""
    STATUS_CHOICES = [
        ('sent', 'Отправлено'),
        ('failed', 'Ошибка'),
        ('skipped', 'Пропущено'),
    ]
    
    accrual = models.ForeignKey(
        'accruals.Accrual',
        on_delete=models.CASCADE,
        related_name='notification_logs',
        verbose_name='Начисление'
    )
    
    tenant = models.ForeignKey(
        'core.Tenant',
        on_delete=models.CASCADE,
        related_name='notification_logs',
        verbose_name='Контрагент'
    )
    
    notification_type = models.CharField(
        max_length=10,
        choices=NotificationSettings.NOTIFICATION_TYPE_CHOICES,
        verbose_name='Тип уведомления'
    )
    
    recipient = models.CharField(
        max_length=255,
        verbose_name='Получатель',
        help_text='Email или телефон'
    )
    
    message = models.TextField(verbose_name='Сообщение')
    
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='sent',
        verbose_name='Статус'
    )
    
    error_message = models.TextField(
        blank=True,
        verbose_name='Сообщение об ошибке'
    )
    
    sent_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Отправлено'
    )
    
    class Meta:
        db_table = 'notification_logs'
        verbose_name = 'Лог уведомления'
        verbose_name_plural = 'Логи уведомлений'
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['accrual', 'status']),
            models.Index(fields=['tenant', 'sent_at']),
        ]
    
    def __str__(self):
        return f'{self.get_notification_type_display()} для {self.tenant.name} - {self.get_status_display()}'
