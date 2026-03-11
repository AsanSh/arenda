from rest_framework import serializers
from decimal import Decimal
from .models import Contract, ContractFile, ContractDiscountPeriod
from properties.serializers import PropertyListSerializer
from core.models import Tenant


class ContractFileSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ContractFile
        fields = ['id', 'file_type', 'file', 'file_url', 'title', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get('request')
        if request:
            try:
                return request.build_absolute_uri(obj.file.url)
            except Exception:
                pass
        try:
            return obj.file.url if obj.file else None
        except Exception:
            return None


class ContractDiscountPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractDiscountPeriod
        fields = ['id', 'start_date', 'end_date', 'discount_percent', 'reason', 'summary']
        read_only_fields = ['id']


class TenantSerializer(serializers.ModelSerializer):
    """Сериализатор для арендатора в договоре"""
    class Meta:
        model = Tenant
        fields = ['id', 'name', 'contact_person', 'email', 'phone']


class ContractSerializer(serializers.ModelSerializer):
    property_detail = PropertyListSerializer(source='property', read_only=True)
    tenant_detail = TenantSerializer(source='tenant', read_only=True)
    files = ContractFileSerializer(read_only=True, many=True)
    discount_periods = ContractDiscountPeriodSerializer(many=True, required=False)

    class Meta:
        model = Contract
        fields = [
            'id', 'number', 'signed_at', 'property', 'property_detail',
            'tenant', 'tenant_detail', 'start_date', 'end_date',
            'rent_amount', 'currency', 'exchange_rate_source', 'due_day',
            'deposit_enabled', 'deposit_amount',
            'advance_enabled', 'advance_months',
            'status', 'comment', 'files', 'discount_periods',
            'created_at', 'updated_at'
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
        
        discount_periods = data.get('discount_periods', [])
        for i, dp in enumerate(discount_periods):
            if dp.get('start_date') and dp.get('end_date') and dp['end_date'] < dp['start_date']:
                raise serializers.ValidationError(
                    f"Льготный период #{i+1}: дата окончания не может быть раньше даты начала"
                )
        
        return data

    def _save_discount_periods(self, contract, discount_periods_data):
        ContractDiscountPeriod.objects.filter(contract=contract).delete()
        for dp in discount_periods_data or []:
            ContractDiscountPeriod.objects.create(
                contract=contract,
                start_date=dp['start_date'],
                end_date=dp['end_date'],
                discount_percent=dp.get('discount_percent', 0),
                reason=dp.get('reason', ''),
                summary=dp.get('summary', ''),
            )

    def create(self, validated_data):
        discount_periods = validated_data.pop('discount_periods', [])
        contract = super().create(validated_data)
        self._save_discount_periods(contract, discount_periods)
        return contract

    def update(self, instance, validated_data):
        discount_periods = validated_data.pop('discount_periods', None)
        contract = super().update(instance, validated_data)
        if discount_periods is not None:
            self._save_discount_periods(contract, discount_periods)
        return contract


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
