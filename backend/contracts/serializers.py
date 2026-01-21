from rest_framework import serializers
from decimal import Decimal
from .models import Contract
from properties.serializers import PropertyListSerializer
from core.models import Tenant


class TenantSerializer(serializers.ModelSerializer):
    """Сериализатор для арендатора в договоре"""
    class Meta:
        model = Tenant
        fields = ['id', 'name', 'contact_person', 'email', 'phone']


class ContractSerializer(serializers.ModelSerializer):
    property_detail = PropertyListSerializer(source='property', read_only=True)
    tenant_detail = TenantSerializer(source='tenant', read_only=True)
    
    class Meta:
        model = Contract
        fields = [
            'id', 'number', 'signed_at', 'property', 'property_detail',
            'tenant', 'tenant_detail', 'start_date', 'end_date',
            'rent_amount', 'currency', 'exchange_rate_source', 'due_day',
            'deposit_enabled', 'deposit_amount',
            'advance_enabled', 'advance_months',
            'status', 'comment', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'number', 'created_at', 'updated_at']
    
    def validate_rent_amount(self, value):
        """Преобразуем rent_amount в Decimal БЕЗ округления - берем точное значение"""
        if value is not None:
            # Преобразуем в Decimal напрямую, без округления
            # DecimalField в модели сам ограничит до 2 знаков при сохранении
            return Decimal(str(value))
        return value
    
    def validate_deposit_amount(self, value):
        """Преобразуем deposit_amount в Decimal БЕЗ округления - берем точное значение"""
        if value is not None:
            return Decimal(str(value))
        return value
    
    def validate(self, data):
        if data.get('start_date') and data.get('end_date'):
            if data['end_date'] < data['start_date']:
                raise serializers.ValidationError("Дата окончания не может быть раньше даты начала")
        
        if data.get('deposit_enabled') and not data.get('deposit_amount'):
            raise serializers.ValidationError("При включенном депозите необходимо указать сумму")
        
        return data


class ContractListSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для списка"""
    property_name = serializers.CharField(source='property.name', read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    
    class Meta:
        model = Contract
        fields = [
            'id', 'number', 'signed_at', 'property_name', 'tenant_name',
            'start_date', 'end_date', 'rent_amount', 'currency',
            'deposit_enabled', 'advance_enabled', 'status'
        ]
