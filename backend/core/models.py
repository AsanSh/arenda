from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Расширенная модель пользователя с ролями"""
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('landlord', 'Арендодатель'),
        ('staff', 'Сотрудник'),
        ('tenant', 'Арендатор'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='staff')
    phone = models.CharField(max_length=20, blank=True)
    
    class Meta:
        db_table = 'users'


class Tenant(models.Model):
    """Контрагент"""
    TYPE_CHOICES = [
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
    phone = models.CharField(max_length=20, blank=True)
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
