from rest_framework import serializers
from .models import Deposit, DepositMovement
from contracts.serializers import ContractListSerializer


class DepositMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = DepositMovement
        fields = [
            'id', 'deposit', 'movement_type', 'amount', 
            'reason', 'comment', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class DepositSerializer(serializers.ModelSerializer):
    contract_detail = ContractListSerializer(source='contract', read_only=True)
    movements = DepositMovementSerializer(many=True, read_only=True)
    
    class Meta:
        model = Deposit
        fields = [
            'id', 'contract', 'contract_detail',
            'amount', 'balance', 'movements',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'balance', 'created_at', 'updated_at']


class DepositListSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для списка"""
    contract_number = serializers.CharField(source='contract.number', read_only=True)
    tenant_name = serializers.CharField(source='contract.tenant.name', read_only=True)
    property_name = serializers.CharField(source='contract.property.name', read_only=True)
    currency = serializers.CharField(source='contract.currency', read_only=True)
    
    class Meta:
        model = Deposit
        fields = [
            'id', 'contract_number', 'tenant_name', 'property_name',
            'amount', 'balance', 'currency'
        ]
