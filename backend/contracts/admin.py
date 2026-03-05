from django.contrib import admin
from .models import Contract, ContractFile


class ContractFileInline(admin.TabularInline):
    model = ContractFile
    extra = 0


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ['number', 'property', 'tenant', 'start_date', 'end_date', 'rent_amount', 'status']
    list_filter = ['status', 'currency']
    search_fields = ['number', 'property__name', 'tenant__name']
    date_hierarchy = 'start_date'
    inlines = [ContractFileInline]


@admin.register(ContractFile)
class ContractFileAdmin(admin.ModelAdmin):
    list_display = ['id', 'contract', 'file_type', 'title', 'created_at']
