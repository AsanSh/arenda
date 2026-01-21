from django.contrib import admin
from .models import Accrual


@admin.register(Accrual)
class AccrualAdmin(admin.ModelAdmin):
    list_display = ['contract', 'period_start', 'period_end', 'final_amount', 'paid_amount', 'balance', 'status']
    list_filter = ['status', 'contract']
    search_fields = ['contract__number']
    date_hierarchy = 'period_start'
