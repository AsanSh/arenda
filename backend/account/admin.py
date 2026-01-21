from django.contrib import admin
from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['date', 'category', 'amount', 'recipient']
    list_filter = ['category', 'date']
    date_hierarchy = 'date'
