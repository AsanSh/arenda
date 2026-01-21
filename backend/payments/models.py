from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from contracts.models import Contract
from accruals.models import Accrual


class Payment(models.Model):
    """Поступление (платеж)"""
    contract = models.ForeignKey(
        Contract, 
        on_delete=models.PROTECT, 
        related_name='payments',
        verbose_name='Договор'
    )
    account = models.ForeignKey(
        'accounts.Account',
        on_delete=models.PROTECT,
        related_name='payments',
        verbose_name='Счет',
        null=True,  # Временно null=True для миграции существующих данных
        blank=True
    )
    amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Сумма'
    )
    payment_date = models.DateField(verbose_name='Дата платежа')
    comment = models.TextField(blank=True, verbose_name='Комментарий')
    allocated_amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0'),
        verbose_name='Распределено'
    )
    is_returned = models.BooleanField(
        default=False,
        verbose_name='Возвращен'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payments'
        verbose_name = 'Поступление'
        verbose_name_plural = 'Поступления'
        ordering = ['-payment_date', '-created_at']
        indexes = [
            models.Index(fields=['contract', 'payment_date']),
        ]
    
    def __str__(self):
        return f"{self.contract.number} - {self.amount} ({self.payment_date})"


class PaymentAllocation(models.Model):
    """Распределение платежа по начислениям"""
    payment = models.ForeignKey(
        Payment, 
        on_delete=models.CASCADE, 
        related_name='allocations',
        verbose_name='Платеж'
    )
    accrual = models.ForeignKey(
        Accrual, 
        on_delete=models.PROTECT, 
        related_name='allocations',
        verbose_name='Начисление'
    )
    amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Сумма распределения'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payment_allocations'
        verbose_name = 'Распределение платежа'
        verbose_name_plural = 'Распределения платежей'
        unique_together = [['payment', 'accrual']]
        indexes = [
            models.Index(fields=['payment']),
            models.Index(fields=['accrual']),
        ]
    
    def __str__(self):
        return f"{self.payment} → {self.accrual}: {self.amount}"
