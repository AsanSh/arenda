from rest_framework import serializers
from .models import Property


class PropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = [
            'id', 'name', 'property_type', 'address', 'area', 
            'status', 'block_floor_room', 'owner', 'comment',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PropertyListSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для списка"""
    class Meta:
        model = Property
        fields = ['id', 'name', 'property_type', 'address', 'area', 'status']
