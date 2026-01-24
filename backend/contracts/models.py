from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from properties.models import Property
from core.models import Tenant


class Contract(models.Model):
    """Договор аренды"""
    STATUS_CHOICES = [
        ('draft', 'Черновик'),
        ('active', 'Активен'),
        ('ended', 'Завершён'),
        ('cancelled', 'Отменён'),
    ]
    
    CURRENCY_CHOICES = [
        ('KGS', 'KGS (сомы)'),
        ('USD', 'USD (доллары)'),
        ('RUB', 'RUB (рубли)'),
        ('EUR', 'EUR (евро)'),
    ]
    
    EXCHANGE_RATE_SOURCE_CHOICES = [
        ('nbkr', 'НБКР (Национальный банк)'),
        ('average', 'Средний курс'),
        ('best', 'Лучший курс'),
    ]
    
    # Автогенерация номера: AMT-YYYY-XXXXXX
    number = models.CharField(max_length=50, unique=True, verbose_name='Номер договора')
    signed_at = models.DateField(verbose_name='Дата подписания')
    property = models.ForeignKey(Property, on_delete=models.PROTECT, related_name='contracts', verbose_name='Объект')
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name='contracts', verbose_name='Арендатор')
    landlord = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name='landlord_contracts',
        null=True,
        blank=True,
        verbose_name='Арендодатель'
    )
    start_date = models.DateField(verbose_name='Дата начала')
    end_date = models.DateField(verbose_name='Дата окончания')
    rent_amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name='Ставка аренды'
    )
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='KGS', verbose_name='Валюта')
    exchange_rate_source = models.CharField(
        max_length=20, 
        choices=EXCHANGE_RATE_SOURCE_CHOICES, 
        default='nbkr',
        verbose_name='Источник курса валют'
    )
    due_day = models.IntegerField(
        default=25, 
        validators=[MinValueValidator(1), MaxValueValidator(31)],
        verbose_name='День оплаты'
    )
    
    # Финансовые условия
    deposit_enabled = models.BooleanField(default=False, verbose_name='Депозит включён')
    deposit_amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name='Сумма депозита'
    )
    advance_enabled = models.BooleanField(default=False, verbose_name='Аванс включён')
    advance_months = models.IntegerField(default=1, validators=[MinValueValidator(1)], verbose_name='Месяцев аванса')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name='Статус')
    comment = models.TextField(blank=True, verbose_name='Комментарий')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'contracts'
        verbose_name = 'Договор'
        verbose_name_plural = 'Договоры'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.number} - {self.property.name} / {self.tenant.name}"
