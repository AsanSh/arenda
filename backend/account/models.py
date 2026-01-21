from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from properties.models import Property
from contracts.models import Contract


class Expense(models.Model):
    """Выплата/расход"""
    CATEGORY_CHOICES = [
        ('dividends', 'Дивиденды'),
        ('utilities', 'Коммунальные'),
        ('founder', 'Учредителю'),
        ('repair', 'Мелкий ремонт'),
        ('salary', 'Зарплата'),
        ('bonus', 'Бонус'),
        ('service', 'Обслуживание'),
        ('transport', 'Транспорт'),
        ('admin', 'Общий админ расход'),
    ]
    
    UTILITY_TAG_CHOICES = [
        ('electricity', 'Свет'),
        ('water', 'Вода'),
        ('gas', 'Газ'),
        ('waste', 'Мусор'),
    ]
    
    date = models.DateField(verbose_name='Дата')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, verbose_name='Категория')
    utility_tag = models.CharField(
        max_length=20, 
        choices=UTILITY_TAG_CHOICES, 
        blank=True,
        verbose_name='Тег коммуналки'
    )
    amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Сумма'
    )
    recipient = models.CharField(max_length=255, blank=True, verbose_name='Получатель/Кому')
    property = models.ForeignKey(
        Property, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='expenses',
        verbose_name='Объект'
    )
    contract = models.ForeignKey(
        Contract, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='expenses',
        verbose_name='Договор'
    )
    comment = models.TextField(blank=True, verbose_name='Комментарий')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'expenses'
        verbose_name = 'Выплата'
        verbose_name_plural = 'Выплаты'
        ordering = ['-date', '-created_at']
    
    def __str__(self):
        return f"{self.get_category_display()} - {self.amount} ({self.date})"
