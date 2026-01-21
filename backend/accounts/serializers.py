from rest_framework import serializers
from .models import Account, AccountTransaction
from core.serializers import TenantSerializer


class AccountSerializer(serializers.ModelSerializer):
    owner_detail = TenantSerializer(source='owner', read_only=True)
    owner_name = serializers.CharField(source='owner.name', read_only=True)
    
    class Meta:
        model = Account
        fields = [
            'id', 'name', 'account_type', 'currency', 'owner', 'owner_detail', 'owner_name',
            'balance', 'account_number', 'bank_name', 'is_active', 'comment',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'balance', 'created_at', 'updated_at']


class AccountListSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для списка"""
    owner_name = serializers.CharField(source='owner.name', read_only=True)
    
    class Meta:
        model = Account
        fields = [
            'id', 'name', 'account_type', 'currency', 'owner_name',
            'balance', 'is_active'
        ]


class AccountTransactionSerializer(serializers.ModelSerializer):
    account_detail = AccountListSerializer(source='account', read_only=True)
    related_account_detail = AccountListSerializer(source='related_account', read_only=True)
    
    class Meta:
        model = AccountTransaction
        fields = [
            'id', 'account', 'account_detail', 'transaction_type', 'amount',
            'transaction_date', 'related_account', 'related_account_detail',
            'related_payment', 'comment', 'created_by', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AccountTransactionListSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для списка операций"""
    account_name = serializers.CharField(source='account.name', read_only=True)
    
    class Meta:
        model = AccountTransaction
        fields = [
            'id', 'account_name', 'transaction_type', 'amount',
            'transaction_date', 'comment'
        ]
