from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid


class User(AbstractUser):
    """Расширенная модель пользователя с ролями и RBAC"""
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('staff', 'Сотрудник'),
        ('tenant', 'Арендатор'),
        ('landlord', 'Арендодатель'),
        ('investor', 'Инвестор'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='staff', verbose_name='Роль')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')
    # Связь с контрагентом (для tenant/landlord/investor)
    counterparty = models.ForeignKey(
        'Tenant',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        verbose_name='Контрагент'
    )
    # Настройки пользователя (JSON поле для гибкости)
    preferences = models.JSONField(default=dict, blank=True, verbose_name='Настройки')
    
    class Meta:
        db_table = 'users'
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    @property
    def counterparty_id(self):
        """Для совместимости с фронтендом"""
        return self.counterparty_id if self.counterparty else None


class Tenant(models.Model):
    """Контрагент"""
    TYPE_CHOICES = [
        ('admin', 'Администратор'),  # Суперадмин - не удалять!
        ('tenant', 'Арендатор'),
        ('landlord', 'Арендодатель'),
        ('staff', 'Сотрудник'),
        ('master', 'Мастер'),
        ('company_owner', 'Владелец компании'),
        ('property_owner', 'Хозяин недвижимости'),
        ('investor', 'Инвестор'),
    ]
    
    name = models.CharField(max_length=255, verbose_name='Название')
    type = models.CharField(
        max_length=20, 
        choices=TYPE_CHOICES, 
        default='tenant',
        verbose_name='Тип'
    )
    contact_person = models.CharField(max_length=255, blank=True, verbose_name='Контактное лицо')
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True, null=True, unique=True, db_index=True, verbose_name='Телефон', help_text='Номер телефона должен быть уникальным. Один номер = один контрагент. Может быть пустым.')
    inn = models.CharField(max_length=20, blank=True, verbose_name='ИНН')
    address = models.TextField(blank=True, verbose_name='Адрес')
    comment = models.TextField(blank=True, verbose_name='Комментарий')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenants'
        verbose_name = 'Контрагент'
        verbose_name_plural = 'Контрагенты'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class ExchangeRate(models.Model):
    """Курс валют"""
    RATE_SOURCE_CHOICES = [
        ('nbkr', 'НБКР (Национальный банк)'),
        ('average', 'Средний курс'),
        ('best', 'Лучший курс'),
    ]
    
    currency = models.CharField(max_length=3, verbose_name='Валюта')
    rate = models.DecimalField(max_digits=12, decimal_places=4, verbose_name='Курс к сому')
    source = models.CharField(max_length=20, choices=RATE_SOURCE_CHOICES, default='nbkr', verbose_name='Источник')
    date = models.DateField(verbose_name='Дата')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'exchange_rates'
        verbose_name = 'Курс валют'
        verbose_name_plural = 'Курсы валют'
        unique_together = [['currency', 'source', 'date']]
        ordering = ['-date', 'currency']
    
    def __str__(self):
        return f"{self.currency} - {self.rate} ({self.get_source_display()})"


class Request(models.Model):
    """Заявка/запрос от клиента"""
    TYPE_CHOICES = [
        ('CHANGE_CONTACTS', 'Изменение контактов'),
        ('CHANGE_REQUISITES', 'Изменение реквизитов'),
        ('CONTRACT_QUESTION', 'Вопрос по договору'),
        ('PAYMENT_QUESTION', 'Вопрос по платежам'),
        ('REQUEST_DOCUMENT', 'Запрос документа/справки'),
        ('PROPERTY_ISSUE', 'Проблема с объектом'),
        ('OTHER', 'Прочее'),
    ]
    
    STATUS_CHOICES = [
        ('NEW', 'Новая'),
        ('IN_REVIEW', 'На рассмотрении'),
        ('NEED_INFO', 'Требуется информация'),
        ('APPROVED', 'Одобрена'),
        ('REJECTED', 'Отклонена'),
        ('DONE', 'Выполнена'),
    ]
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_requests',
        verbose_name='Создал'
    )
    role = models.CharField(max_length=20, verbose_name='Роль создателя')
    counterparty = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='requests',
        null=True,
        blank=True,
        verbose_name='Контрагент'
    )
    
    type = models.CharField(max_length=30, choices=TYPE_CHOICES, verbose_name='Тип заявки')
    subject = models.CharField(max_length=255, verbose_name='Тема')
    message = models.TextField(verbose_name='Сообщение')
    attachments = models.JSONField(default=list, blank=True, verbose_name='Вложения')
    
    # Связи с другими сущностями
    related_contract = models.ForeignKey(
        'contracts.Contract',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='requests',
        verbose_name='Связанный договор'
    )
    related_property = models.ForeignKey(
        'properties.Property',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='requests',
        verbose_name='Связанный объект'
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NEW', verbose_name='Статус')
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_requests',
        verbose_name='Назначено'
    )
    internal_comment = models.TextField(blank=True, verbose_name='Внутренний комментарий')
    public_reply = models.TextField(blank=True, verbose_name='Публичный ответ')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлено')
    
    class Meta:
        db_table = 'requests'
        verbose_name = 'Заявка'
        verbose_name_plural = 'Заявки'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['created_by', 'status']),
            models.Index(fields=['assigned_to', 'status']),
        ]
    
    def __str__(self):
        return f"{self.get_type_display()} - {self.subject} ({self.get_status_display()})"


class InvestorLink(models.Model):
    """Связь инвестора с объектами/договорами"""
    investor = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='investor_links',
        verbose_name='Инвестор'
    )
    property = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='investor_links',
        verbose_name='Объект'
    )
    contract = models.ForeignKey(
        'contracts.Contract',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='investor_links',
        verbose_name='Договор'
    )
    share = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=100.00,
        verbose_name='Доля (%)'
    )
    status = models.CharField(
        max_length=20,
        choices=[('active', 'Активна'), ('inactive', 'Неактивна')],
        default='active',
        verbose_name='Статус'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    
    class Meta:
        db_table = 'investor_links'
        verbose_name = 'Связь инвестора'
        verbose_name_plural = 'Связи инвесторов'
        unique_together = [
            ['investor', 'property'],
            ['investor', 'contract'],
        ]
    
    def __str__(self):
        if self.property:
            return f"{self.investor.name} -> {self.property.name} ({self.share}%)"
        elif self.contract:
            return f"{self.investor.name} -> {self.contract.number} ({self.share}%)"
        return f"{self.investor.name} (связь)"


class StaffAssignment(models.Model):
    """Назначение сотрудника на объекты/договоры/контрагентов"""
    staff = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='assignments',
        verbose_name='Сотрудник'
    )
    property = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='staff_assignments',
        verbose_name='Объект'
    )
    contract = models.ForeignKey(
        'contracts.Contract',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='staff_assignments',
        verbose_name='Договор'
    )
    counterparty = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='staff_assignments',
        verbose_name='Контрагент'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    
    class Meta:
        db_table = 'staff_assignments'
        verbose_name = 'Назначение сотрудника'
        verbose_name_plural = 'Назначения сотрудников'
        unique_together = [
            ['staff', 'property'],
            ['staff', 'contract'],
            ['staff', 'counterparty'],
        ]
    
    def __str__(self):
        if self.property:
            return f"{self.staff.username} -> {self.property.name}"
        elif self.contract:
            return f"{self.staff.username} -> {self.contract.number}"
        elif self.counterparty:
            return f"{self.staff.username} -> {self.counterparty.name}"
        return f"{self.staff.username} (назначение)"


class LoginAttempt(models.Model):
    """Попытка входа через WhatsApp QR"""
    STATUS_CHOICES = [
        ('NEW', 'Новая'),
        ('VERIFIED', 'Подтверждена'),
        ('COMPLETED', 'Завершена'),
        ('FAILED', 'Ошибка'),
    ]
    
    FAILURE_REASON_CHOICES = [
        ('ATTEMPT_EXPIRED', 'Попытка истекла'),
        ('PHONE_NOT_UNIQUE', 'Номер привязан к нескольким аккаунтам'),
        ('USER_NOT_FOUND', 'Номер не зарегистрирован'),
        ('PARSE_FAILED', 'Ошибка парсинга сообщения'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt_id = models.CharField(max_length=64, unique=True, db_index=True, verbose_name='ID попытки')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NEW', db_index=True, verbose_name='Статус')
    failure_reason = models.CharField(
        max_length=30, 
        choices=FAILURE_REASON_CHOICES, 
        null=True, 
        blank=True,
        verbose_name='Причина ошибки'
    )
    verified_phone = models.CharField(max_length=20, null=True, blank=True, db_index=True, verbose_name='Подтвержденный телефон')
    expected_phone = models.CharField(max_length=20, null=True, blank=True, verbose_name='Ожидаемый телефон')
    otp_code = models.CharField(max_length=6, null=True, blank=True, db_index=True, verbose_name='OTP код')
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='login_attempts',
        verbose_name='Пользователь'
    )
    metadata = models.JSONField(default=dict, blank=True, verbose_name='Метаданные')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='Создано')
    expires_at = models.DateTimeField(db_index=True, verbose_name='Истекает')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлено')
    
    class Meta:
        db_table = 'login_attempts'
        verbose_name = 'Попытка входа'
        verbose_name_plural = 'Попытки входа'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['attempt_id', 'status']),
            models.Index(fields=['status', 'expires_at']),
            models.Index(fields=['verified_phone', 'status']),
        ]
    
    def __str__(self):
        return f"{self.attempt_id} - {self.get_status_display()} ({self.verified_phone or 'N/A'})"
    
    def is_expired(self):
        """Проверка истечения попытки"""
        from django.utils import timezone
        return timezone.now() > self.expires_at
