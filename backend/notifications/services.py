from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from .models import NotificationSettings, NotificationLog
from accruals.models import Accrual
from core.models import Tenant


class NotificationService:
    """Сервис для отправки уведомлений"""
    
    @staticmethod
    def format_message(template: str, accrual: Accrual) -> str:
        """Форматирование сообщения с подстановкой переменных"""
        contract = accrual.contract
        tenant = contract.tenant
        property_obj = contract.property
        
        # Форматирование даты
        due_date_str = accrual.due_date.strftime('%d.%m.%Y')
        
        # Форматирование суммы
        amount_str = f"{accrual.balance:,.2f}".replace(',', ' ')
        
        replacements = {
            '{tenant_name}': tenant.name,
            '{contract_number}': contract.number or 'N/A',
            '{due_date}': due_date_str,
            '{amount}': amount_str,
            '{currency}': contract.currency or 'сом',
            '{property_name}': property_obj.name if property_obj else 'N/A',
            '{property_address}': property_obj.address if property_obj and property_obj.address else 'N/A',
        }
        
        message = template
        for key, value in replacements.items():
            message = message.replace(key, str(value))
        
        return message
    
    @staticmethod
    def get_recipient(tenant: Tenant, notification_type: str) -> str:
        """Получить получателя (email или телефон)"""
        if notification_type == 'email':
            return tenant.email or ''
        elif notification_type == 'sms':
            return tenant.phone or ''
        return ''
    
    @staticmethod
    def send_email(recipient: str, subject: str, message: str) -> tuple[bool, str]:
        """Отправка email (заглушка - нужно настроить SMTP)"""
        # TODO: Реализовать отправку email через Django EmailBackend
        # from django.core.mail import send_mail
        # try:
        #     send_mail(subject, message, 'noreply@zakup.one', [recipient])
        #     return True, ''
        # except Exception as e:
        #     return False, str(e)
        
        # Временная заглушка
        print(f"[EMAIL] To: {recipient}")
        print(f"[EMAIL] Subject: {subject}")
        print(f"[EMAIL] Message: {message}")
        return True, ''
    
    @staticmethod
    def send_sms(recipient: str, message: str) -> tuple[bool, str]:
        """Отправка SMS (заглушка - нужно подключить SMS-провайдер)"""
        # TODO: Реализовать отправку SMS через SMS-провайдер
        # Например, через sms.ru, twilio и т.д.
        
        # Временная заглушка
        print(f"[SMS] To: {recipient}")
        print(f"[SMS] Message: {message}")
        return True, ''
    
    @staticmethod
    def send_notification(accrual: Accrual) -> bool:
        """Отправить уведомление для начисления"""
        settings = NotificationSettings.get_settings()
        
        if not settings.is_enabled:
            return False
        
        # Проверяем, нужно ли отправлять уведомление
        today = timezone.now().date()
        days_until_due = (accrual.due_date - today).days
        
        # Отправляем только если до срока оплаты осталось указанное количество дней
        if days_until_due != settings.days_before:
            return False
        
        # Проверяем, что начисление еще не оплачено полностью
        if accrual.balance <= 0:
            return False
        
        contract = accrual.contract
        tenant = contract.tenant
        
        # Получаем получателя
        recipient = NotificationService.get_recipient(tenant, settings.notification_type)
        
        if not recipient:
            # Логируем пропуск
            NotificationLog.objects.create(
                accrual=accrual,
                tenant=tenant,
                notification_type=settings.notification_type,
                recipient='',
                message='',
                status='skipped',
                error_message=f'У контрагента не указан {settings.get_notification_type_display()}'
            )
            return False
        
        # Форматируем сообщение
        message = NotificationService.format_message(settings.message_template, accrual)
        
        # Отправляем уведомление
        if settings.notification_type == 'email':
            success, error = NotificationService.send_email(
                recipient,
                f'Напоминание об оплате - {contract.number}',
                message
            )
        else:  # sms
            success, error = NotificationService.send_sms(recipient, message)
        
        # Логируем результат
        NotificationLog.objects.create(
            accrual=accrual,
            tenant=tenant,
            notification_type=settings.notification_type,
            recipient=recipient,
            message=message,
            status='sent' if success else 'failed',
            error_message=error if not success else ''
        )
        
        return success
    
    @staticmethod
    def send_pending_notifications():
        """Отправить все ожидающие уведомления"""
        settings = NotificationSettings.get_settings()
        
        if not settings.is_enabled:
            return 0
        
        today = timezone.now().date()
        target_date = today + timedelta(days=settings.days_before)
        
        # Находим начисления, для которых нужно отправить уведомления
        accruals = Accrual.objects.filter(
            due_date=target_date,
            balance__gt=0,
            status__in=['planned', 'due', 'overdue', 'partial']
        ).select_related('contract', 'contract__tenant', 'contract__property')
        
        sent_count = 0
        for accrual in accruals:
            if NotificationService.send_notification(accrual):
                sent_count += 1
        
        return sent_count
