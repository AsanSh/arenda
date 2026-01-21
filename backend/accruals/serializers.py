from rest_framework import serializers
from .models import Accrual
from contracts.serializers import ContractListSerializer


class AccrualSerializer(serializers.ModelSerializer):
    contract_detail = ContractListSerializer(source='contract', read_only=True)
    
    class Meta:
        model = Accrual
        fields = [
            'id', 'contract', 'contract_detail',
            'period_start', 'period_end', 'due_date',
            'base_amount', 'adjustments', 'utilities_amount', 'final_amount',
            'paid_amount', 'balance', 'status', 'comment',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'final_amount', 'paid_amount', 'balance', 
            'status', 'created_at', 'updated_at'
        ]


class AccrualListSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для списка"""
    contract_number = serializers.CharField(source='contract.number', read_only=True)
    property_id = serializers.IntegerField(source='contract.property.id', read_only=True)
    property_name = serializers.CharField(source='contract.property.name', read_only=True)
    property_address = serializers.CharField(source='contract.property.address', read_only=True)
    tenant_name = serializers.CharField(source='contract.tenant.name', read_only=True)
    currency = serializers.CharField(source='contract.currency', read_only=True)
    utility_type_display = serializers.CharField(source='get_utility_type_display', read_only=True)
    overdue_days = serializers.SerializerMethodField()
    
    class Meta:
        model = Accrual
        fields = [
            'id', 'contract_number', 'property_id', 'property_name', 'property_address', 'tenant_name',
            'period_start', 'period_end', 'due_date', 'overdue_days',
            'base_amount', 'final_amount', 'paid_amount', 'balance', 'status', 'currency',
            'utility_type', 'utility_type_display'
        ]
    
    def get_overdue_days(self, obj):
        """Вычисляет количество просроченных дней"""
        from django.utils import timezone
        today = timezone.now().date()
        # Проверяем просрочку по дате, независимо от статуса
        if obj.due_date < today and obj.balance > 0:
            return (today - obj.due_date).days
        return 0