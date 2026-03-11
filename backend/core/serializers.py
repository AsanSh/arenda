from rest_framework import serializers
from .models import Tenant, ExchangeRate, Request, InvestorLink, StaffAssignment, AuditLog
from .utils import normalize_phone
from django.contrib.auth import get_user_model

User = get_user_model()


class AuditLogSerializer(serializers.ModelSerializer):
    """Сериализатор для логов изменений в настройках."""
    user_name = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'action', 'action_display',
            'target_model', 'target_id', 'target_repr',
            'old_data', 'new_data', 'reason', 'created_at',
        ]
        read_only_fields = fields


class TenantSerializer(serializers.ModelSerializer):
    """Сериализатор для контрагента"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate_phone(self, value):
        """Валидация и нормализация номера (формат 996XXXXXXXXX как в core.utils)"""
        if not value or not str(value).strip():
            return value
        normalized = normalize_phone(str(value).strip())
        if not normalized:
            raise serializers.ValidationError(
                "Некорректный номер телефона. Укажите 9 или 12 цифр (с 996 или без)."
            )
        instance = self.instance
        for variant in [normalized, f"+{normalized}"]:
            existing = Tenant.objects.filter(phone=variant)
            if instance:
                existing = existing.exclude(pk=instance.pk)
            if existing.exists():
                raise serializers.ValidationError(
                    "Контрагент с этим номером телефона уже существует."
                )
        return normalized
    
    def validate_additional_contacts(self, value):
        if not isinstance(value, list):
            return []
        result = []
        for item in value:
            if not isinstance(item, dict):
                continue
            name = (item.get('name') or '').strip()
            phone = (item.get('phone') or '').strip()
            if name or phone:
                normalized = normalize_phone(phone) if phone else ''
                result.append({'name': name, 'phone': normalized or phone})
        return result

    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'type', 'type_display', 'contact_person',
            'email', 'phone', 'inn', 'address', 'comment',
            'additional_contacts',
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
