from rest_framework import serializers
from .models import Payment, PaymentAllocation
from contracts.serializers import ContractListSerializer
from accruals.serializers import AccrualListSerializer
from accounts.serializers import AccountSerializer


class PaymentAllocationSerializer(serializers.ModelSerializer):
    accrual_detail = AccrualListSerializer(source='accrual', read_only=True)
    
    class Meta:
        model = PaymentAllocation
        fields = ['id', 'accrual', 'accrual_detail', 'amount', 'created_at']
        read_only_fields = ['id', 'created_at']


class PaymentSerializer(serializers.ModelSerializer):
    contract_detail = ContractListSerializer(source='contract', read_only=True)
    account_detail = AccountSerializer(source='account', read_only=True)
    allocations = PaymentAllocationSerializer(many=True, read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'contract', 'contract_detail',
            'account', 'account_detail',
            'amount', 'payment_date', 'comment',
            'allocated_amount', 'allocations',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'allocated_amount', 'created_at', 'updated_at']


class PaymentListSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для списка"""
    contract_number = serializers.CharField(source='contract.number', read_only=True)
    tenant_name = serializers.CharField(source='contract.tenant.name', read_only=True)
    property_name = serializers.CharField(source='contract.property.name', read_only=True)
    currency = serializers.CharField(source='contract.currency', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'contract_number', 'tenant_name', 'property_name',
            'account', 'account_name',
            'amount', 'payment_date', 'allocated_amount', 'comment', 'currency', 'is_returned'
        ]
