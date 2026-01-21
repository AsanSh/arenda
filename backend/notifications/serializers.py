from rest_framework import serializers
from .models import NotificationSettings, NotificationLog
from accruals.serializers import AccrualListSerializer
from core.serializers import TenantSerializer


class NotificationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationSettings
        fields = [
            'id', 'notification_type', 'days_before', 'message_template',
            'is_enabled', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NotificationLogSerializer(serializers.ModelSerializer):
    accrual_detail = AccrualListSerializer(source='accrual', read_only=True)
    tenant_detail = TenantSerializer(source='tenant', read_only=True)
    
    class Meta:
        model = NotificationLog
        fields = [
            'id', 'accrual', 'accrual_detail', 'tenant', 'tenant_detail',
            'notification_type', 'recipient', 'message', 'status',
            'error_message', 'sent_at'
        ]
        read_only_fields = ['id', 'sent_at']
