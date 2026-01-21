from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from contracts.models import Contract


class Deposit(models.Model):
    """Депозит по договору"""
    contract = models.OneToOneField(
        Contract, 
        on_delete=models.CASCADE, 
        related_name='deposit',
        verbose_name='Договор'
    )
    amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name='Сумма депозита'
    )
    balance = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name='Остаток'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'deposits'
        verbose_name = 'Депозит'
        verbose_name_plural = 'Депозиты'
    
    def __str__(self):
        return f"{self.contract.number} - Депозит: {self.balance}/{self.amount}"


class DepositMovement(models.Model):
    """Движение по депозиту"""
    MOVEMENT_TYPE_CHOICES = [
        ('in', 'Внесение'),
        ('out', 'Списание'),
        ('refund', 'Возврат'),
    ]
    
    REASON_CHOICES = [
        ('debt', 'Погашение долга'),
        ('damage', 'Ущерб'),
        ('other', 'Прочее'),
    ]
    
    deposit = models.ForeignKey(
        Deposit, 
        on_delete=models.CASCADE, 
        related_name='movements',
        verbose_name='Депозит'
    )
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPE_CHOICES, verbose_name='Тип движения')
    amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Сумма'
    )
    reason = models.CharField(max_length=20, choices=REASON_CHOICES, blank=True, verbose_name='Причина')
    comment = models.TextField(blank=True, verbose_name='Комментарий')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'deposit_movements'
        verbose_name = 'Движение по депозиту'
        verbose_name_plural = 'Движения по депозитам'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.deposit.contract.number} - {self.get_movement_type_display()}: {self.amount}"
