"""
Модели для инвесторского кабинета.
Расширяют существующий InvestorLink. Не ломают текущую логику.
"""
from django.db import models
from decimal import Decimal


class InvestmentProject(models.Model):
    """
    Проект/объект инвестирования.
    Связь с Property через investor_links или как отдельная сущность.
    """
    name = models.CharField(max_length=255, verbose_name='Название')
    property = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='investment_projects',
        verbose_name='Объект',
    )
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'investment_projects'
        verbose_name = 'Инвестиционный проект'
        verbose_name_plural = 'Инвестиционные проекты'

    def __str__(self):
        return self.name


class InvestorPosition(models.Model):
    """Позиция инвестора: сумма вложений, дата входа."""
    investor = models.ForeignKey(
        'core.Tenant',
        on_delete=models.CASCADE,
        related_name='investor_positions',
        verbose_name='Инвестор',
    )
    project = models.ForeignKey(
        InvestmentProject,
        on_delete=models.CASCADE,
        related_name='positions',
        verbose_name='Проект',
        null=True,
        blank=True,
    )
    property = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='investor_positions',
        verbose_name='Объект',
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='Сумма вложения',
    )
    date_from = models.DateField(verbose_name='Дата входа')
    date_to = models.DateField(null=True, blank=True, verbose_name='Дата выхода')
    share_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='Доля (%)',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'investor_positions'
        verbose_name = 'Позиция инвестора'
        verbose_name_plural = 'Позиции инвесторов'

    def __str__(self):
        return f"{self.investor.name} — {self.amount}"


class InvestorPayout(models.Model):
    """Выплата инвестору."""
    investor = models.ForeignKey(
        'core.Tenant',
        on_delete=models.CASCADE,
        related_name='investor_payouts',
        verbose_name='Инвестор',
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Сумма',
    )
    payout_date = models.DateField(verbose_name='Дата выплаты')
    project = models.ForeignKey(
        InvestmentProject,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payouts',
        verbose_name='Проект',
    )
    comment = models.TextField(blank=True, verbose_name='Комментарий')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'investor_payouts'
        verbose_name = 'Выплата инвестору'
        verbose_name_plural = 'Выплаты инвесторам'

    def __str__(self):
        return f"{self.investor.name} — {self.amount} ({self.payout_date})"


class InvestorReport(models.Model):
    """Отчёт для инвестора (документ, период)."""
    investor = models.ForeignKey(
        'core.Tenant',
        on_delete=models.CASCADE,
        related_name='investor_reports',
        verbose_name='Инвестор',
    )
    title = models.CharField(max_length=255, verbose_name='Название')
    period_from = models.DateField(null=True, blank=True, verbose_name='Период с')
    period_to = models.DateField(null=True, blank=True, verbose_name='Период по')
    file = models.FileField(
        upload_to='investor_reports/%Y/%m/',
        null=True,
        blank=True,
        verbose_name='Файл',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'investor_reports'
        verbose_name = 'Отчёт инвестору'
        verbose_name_plural = 'Отчёты инвесторам'

    def __str__(self):
        return f"{self.title} — {self.investor.name}"
