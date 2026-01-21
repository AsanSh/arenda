from django.contrib import admin
from .models import Contract


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ['number', 'property', 'tenant', 'start_date', 'end_date', 'rent_amount', 'status']
    list_filter = ['status', 'currency']
    search_fields = ['number', 'property__name', 'tenant__name']
    date_hierarchy = 'start_date'
