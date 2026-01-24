from rest_framework import serializers
from .models import Tenant, ExchangeRate, Request, InvestorLink, StaffAssignment
from django.contrib.auth import get_user_model

User = get_user_model()


class TenantSerializer(serializers.ModelSerializer):
    """Сериализатор для контрагента"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    def validate_phone(self, value):
        """Валидация уникальности номера телефона"""
        if not value:
            return value
        
        # Нормализуем номер для проверки
        normalized = ''.join(filter(str.isdigit, value))
        if normalized.startswith('996') and len(normalized) == 12:
            normalized = f"+{normalized}"
        elif len(normalized) == 9:
            normalized = f"+996{normalized}"
        else:
            normalized = value
        
        # Проверяем уникальность (исключаем текущий объект при обновлении)
        instance = self.instance
        existing = Tenant.objects.filter(phone=normalized)
        if instance:
            existing = existing.exclude(pk=instance.pk)
        
        # Также проверяем варианты без + и с разными форматами
        variants = [
            normalized,
            normalized.replace('+', ''),
            normalized.replace('+996', ''),
            f"996{normalized.replace('+', '').replace('996', '')}" if normalized.startswith('+996') else normalized,
        ]
        
        for variant in variants:
            if variant:
                existing_variant = Tenant.objects.filter(phone=variant)
                if instance:
                    existing_variant = existing_variant.exclude(pk=instance.pk)
                if existing_variant.exists():
                    raise serializers.ValidationError(
                        f"Контрагент с номером {variant} уже существует. Один номер может принадлежать только одному контрагенту."
                    )
        
        return normalized
    
    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'type', 'type_display', 'contact_person',
            'email', 'phone', 'inn', 'address', 'comment',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ExchangeRateSerializer(serializers.ModelSerializer):
    """Сериализатор для курса валют"""
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    
    class Meta:
        model = ExchangeRate
        fields = ['id', 'currency', 'rate', 'source', 'source_display', 'date', 'created_at']
        read_only_fields = ['id', 'created_at']


class RequestSerializer(serializers.ModelSerializer):
    """Сериализатор для заявки"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.username', read_only=True, allow_null=True)
    related_contract_number = serializers.CharField(source='related_contract.number', read_only=True, allow_null=True)
    related_property_name = serializers.CharField(source='related_property.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Request
        fields = [
            'id', 'created_at', 'created_by', 'created_by_name', 'role',
            'counterparty', 'type', 'type_display', 'subject', 'message',
            'attachments', 'related_contract', 'related_contract_number',
            'related_property', 'related_property_name', 'status', 'status_display',
            'assigned_to', 'assigned_to_name', 'internal_comment', 'public_reply',
            'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'created_by', 'role', 'updated_at',
            'assigned_to', 'internal_comment'
        ]
    
    def create(self, validated_data):
        """Автоматически устанавливаем created_by и role"""
        request = self.context['request']
        validated_data['created_by'] = request.user
        validated_data['role'] = request.user.role
        if request.user.counterparty:
            validated_data['counterparty'] = request.user.counterparty
        return super().create(validated_data)


class RequestListSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для списка заявок"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Request
        fields = [
            'id', 'created_at', 'type', 'type_display', 'subject',
            'status', 'status_display', 'assigned_to', 'updated_at'
        ]


class InvestorLinkSerializer(serializers.ModelSerializer):
    """Сериализатор для связи инвестора"""
    investor_name = serializers.CharField(source='investor.name', read_only=True)
    property_name = serializers.CharField(source='property.name', read_only=True, allow_null=True)
    contract_number = serializers.CharField(source='contract.number', read_only=True, allow_null=True)
    
    class Meta:
        model = InvestorLink
        fields = [
            'id', 'investor', 'investor_name', 'property', 'property_name',
            'contract', 'contract_number', 'share', 'status', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class StaffAssignmentSerializer(serializers.ModelSerializer):
    """Сериализатор для назначения сотрудника"""
    staff_name = serializers.CharField(source='staff.username', read_only=True)
    property_name = serializers.CharField(source='property.name', read_only=True, allow_null=True)
    contract_number = serializers.CharField(source='contract.number', read_only=True, allow_null=True)
    counterparty_name = serializers.CharField(source='counterparty.name', read_only=True, allow_null=True)
    
    class Meta:
        model = StaffAssignment
        fields = [
            'id', 'staff', 'staff_name', 'property', 'property_name',
            'contract', 'contract_number', 'counterparty', 'counterparty_name',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']
