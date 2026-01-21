from django.db import models


class Property(models.Model):
    """Объект недвижимости"""
    PROPERTY_TYPE_CHOICES = [
        ('office', 'Офис'),
        ('shop', 'Магазин'),
        ('medical', 'Медкабинет'),
        ('apartment', 'Квартира'),
        ('warehouse', 'Склад'),
        ('other', 'Прочее'),
    ]
    
    STATUS_CHOICES = [
        ('free', 'Свободен'),
        ('rented', 'Сдан'),
        ('reserved', 'Бронь'),
        ('inactive', 'Неактивен'),
    ]
    
    name = models.CharField(max_length=255, verbose_name='Название объекта')
    property_type = models.CharField(
        max_length=20, 
        choices=PROPERTY_TYPE_CHOICES, 
        verbose_name='Тип недвижимости'
    )
    address = models.CharField(max_length=500, verbose_name='Адрес')
    area = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Площадь м²')
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='free',
        verbose_name='Статус'
    )
    block_floor_room = models.CharField(
        max_length=100, 
        blank=True, 
        verbose_name='Блок/Этаж/№ помещения'
    )
    owner = models.CharField(max_length=255, blank=True, verbose_name='Владелец')
    comment = models.TextField(blank=True, verbose_name='Комментарий')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'properties'
        verbose_name = 'Объект недвижимости'
        verbose_name_plural = 'Объекты недвижимости'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.address})"
