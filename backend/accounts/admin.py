from django.contrib import admin
from .models import Account, AccountTransaction


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ['name', 'account_type', 'currency', 'owner', 'balance', 'is_active']
    list_filter = ['account_type', 'currency', 'is_active']
    search_fields = ['name', 'account_number', 'bank_name']


@admin.register(AccountTransaction)
class AccountTransactionAdmin(admin.ModelAdmin):
    list_display = ['account', 'transaction_type', 'amount', 'transaction_date']
    list_filter = ['transaction_type', 'transaction_date']
    search_fields = ['account__name', 'comment']
    date_hierarchy = 'transaction_date'
