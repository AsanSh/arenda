from django.db import models
from django.core.validators import MinValueValidator
from django.conf import settings
from decimal import Decimal
from core.models import Tenant


class Account(models.Model):
    """Счет для учета денежных средств"""
    ACCOUNT_TYPE_CHOICES = [
        ('cash', 'Наличные'),
        ('bank', 'Банковский счет'),
    ]
    
    CURRENCY_CHOICES = [
        ('KGS', 'KGS (сомы)'),
        ('USD', 'USD (доллары)'),
    ]
    
    name = models.CharField(max_length=255, verbose_name='Название счета')
    account_type = models.CharField(
        max_length=20, 
        choices=ACCOUNT_TYPE_CHOICES, 
        verbose_name='Тип счета'
    )
    currency = models.CharField(
        max_length=3, 
        choices=CURRENCY_CHOICES, 
        default='KGS',
        verbose_name='Валюта'
    )
    owner = models.ForeignKey(
        Tenant, 
        on_delete=models.PROTECT, 
        related_name='accounts',
        verbose_name='Владелец (контрагент)',
        null=True,
        blank=True
    )
    balance = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name='Баланс'
    )
    account_number = models.CharField(max_length=100, blank=True, verbose_name='Номер счета')
    bank_name = models.CharField(max_length=255, blank=True, verbose_name='Название банка')
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    comment = models.TextField(blank=True, verbose_name='Комментарий')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'accounts'
        verbose_name = 'Счет'
        verbose_name_plural = 'Счета'
        ordering = ['name']
    
    def __str__(self):
        owner_name = self.owner.name if self.owner else 'Общий'
        return f"{self.name} ({owner_name}) - {self.get_account_type_display()}"


class AccountTransaction(models.Model):
    """Операция по счету"""
    TRANSACTION_TYPE_CHOICES = [
        ('income', 'Поступление'),
        ('expense', 'Расход'),
        ('transfer_in', 'Перевод (входящий)'),
        ('transfer_out', 'Перевод (исходящий)'),
        ('adjustment', 'Корректировка'),
    ]
    
    account = models.ForeignKey(
        Account, 
        on_delete=models.PROTECT, 
        related_name='transactions',
        verbose_name='Счет'
    )
    transaction_type = models.CharField(
        max_length=20, 
        choices=TRANSACTION_TYPE_CHOICES, 
        verbose_name='Тип операции'
    )
    amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Сумма'
    )
    transaction_date = models.DateField(verbose_name='Дата операции')
    related_account = models.ForeignKey(
        Account, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='related_transactions',
        verbose_name='Связанный счет (для переводов)'
    )
    related_payment = models.ForeignKey(
        'payments.Payment', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='account_transactions',
        verbose_name='Связанное поступление'
    )
    related_expense = models.ForeignKey(
        'account.Expense', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='account_transactions',
        verbose_name='Связанный расход'
    )
    comment = models.TextField(blank=True, verbose_name='Комментарий')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        verbose_name='Создал'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'account_transactions'
        verbose_name = 'Операция по счету'
        verbose_name_plural = 'Операции по счетам'
        ordering = ['-transaction_date', '-created_at']
        indexes = [
            models.Index(fields=['account', 'transaction_date']),
        ]
    
    def __str__(self):
        return f"{self.account.name} - {self.get_transaction_type_display()}: {self.amount} ({self.transaction_date})"
