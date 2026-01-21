from django.contrib import admin
from .models import Payment, PaymentAllocation


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['contract', 'amount', 'payment_date', 'allocated_amount']
    list_filter = ['payment_date']
    search_fields = ['contract__number']
    date_hierarchy = 'payment_date'


@admin.register(PaymentAllocation)
class PaymentAllocationAdmin(admin.ModelAdmin):
    list_display = ['payment', 'accrual', 'amount']
    list_filter = ['payment']
