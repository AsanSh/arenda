from django.contrib import admin
from .models import Deposit, DepositMovement


@admin.register(Deposit)
class DepositAdmin(admin.ModelAdmin):
    list_display = ['contract', 'amount', 'balance']
    search_fields = ['contract__number']


@admin.register(DepositMovement)
class DepositMovementAdmin(admin.ModelAdmin):
    list_display = ['deposit', 'movement_type', 'amount', 'reason', 'created_at']
    list_filter = ['movement_type', 'reason']
