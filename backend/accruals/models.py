from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from contracts.models import Contract


class Accrual(models.Model):
    """Начисление по договору"""
    STATUS_CHOICES = [
        ('planned', 'Ожидает'),
        ('due', 'К оплате'),
        ('overdue', 'Просрочено'),
        ('partial', 'Частично оплачено'),
        ('paid', 'Оплачено'),
    ]
    
    UTILITY_TYPE_CHOICES = [
        ('rent', 'Аренда'),
        ('electricity', 'Электричество'),
        ('water', 'Вода'),
        ('gas', 'Газ'),
        ('garbage', 'Мусор'),
        ('service', 'Сервисное обслуживание'),
        ('salary', 'Зарплата'),
        ('transport', 'Транспортные расходы'),
        ('other', 'Прочие расходы'),
    ]
    
    contract = models.ForeignKey(
        Contract, 
        on_delete=models.CASCADE, 
        related_name='accruals',
        verbose_name='Договор'
    )
    period_start = models.DateField(verbose_name='Начало периода')
    period_end = models.DateField(verbose_name='Конец периода')
    due_date = models.DateField(verbose_name='Срок оплаты')
    
    # Суммы
    base_amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name='Базовая сумма (аренда)'
    )
    adjustments = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0'),
        verbose_name='Корректировки'
    )
    utilities_amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name='Коммунальные услуги'
    )
    utility_type = models.CharField(
        max_length=20,
        choices=UTILITY_TYPE_CHOICES,
        default='rent',
        verbose_name='Тип начисления'
    )
    final_amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name='Итоговая сумма'
    )
    
    # Оплата
    paid_amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name='Оплачено'
    )
    balance = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0'),
        verbose_name='Остаток'
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned', verbose_name='Статус')
    comment = models.TextField(blank=True, verbose_name='Комментарий')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'accruals'
        verbose_name = 'Начисление'
        verbose_name_plural = 'Начисления'
        ordering = ['due_date', 'id']  # Сортировка по сроку оплаты (по возрастанию - сначала ближайшие)
        indexes = [
            models.Index(fields=['contract', 'period_start']),
            models.Index(fields=['status', 'due_date']),
        ]
    
    def __str__(self):
        return f"{self.contract.number} - {self.period_start} / {self.final_amount}"
    
    def recalculate(self):
        """Пересчет итоговой суммы и остатка"""
        from django.utils import timezone
        
        self.final_amount = self.base_amount + self.adjustments + self.utilities_amount
        self.balance = self.final_amount - self.paid_amount
        
        today = timezone.now().date()
        
        # Обновление статуса
        if self.balance <= 0:
            self.status = 'paid'
        else:
            # Проверяем просрочку в первую очередь (даже если есть частичная оплата)
            if self.due_date < today:
                # Если просрочено и есть остаток - статус overdue
                # Если просрочено, но полностью оплачено - статус paid (уже обработано выше)
                self.status = 'overdue'
            elif self.due_date == today or (self.due_date - today).days <= 3:
                # К оплате в ближайшие дни
                if self.paid_amount > 0:
                    self.status = 'partial'
                else:
                    self.status = 'due'
            else:
                # Будущее начисление
                if self.paid_amount > 0:
                    self.status = 'partial'
                else:
                    self.status = 'planned'
        
        self.save()
