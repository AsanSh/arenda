from django.contrib import admin
from .models import Property


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ['name', 'property_type', 'address', 'area', 'status']
    list_filter = ['property_type', 'status']
    search_fields = ['name', 'address']
