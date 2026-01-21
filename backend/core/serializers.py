from rest_framework import serializers
from .models import Tenant, ExchangeRate


class TenantSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'type', 'type_display', 'contact_person', 'email', 'phone', 
            'inn', 'address', 'comment', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'type_display', 'created_at', 'updated_at']
        extra_kwargs = {
            'email': {'required': True, 'allow_blank': False},
            'phone': {'required': True, 'allow_blank': False},
        }


class ExchangeRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExchangeRate
        fields = ['id', 'currency', 'rate', 'source', 'date', 'created_at']
        read_only_fields = ['id', 'created_at']
