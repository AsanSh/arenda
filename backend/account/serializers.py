from rest_framework import serializers
from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = [
            'id', 'date', 'category', 'utility_tag', 'amount',
            'recipient', 'property', 'contract', 'comment',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ExpenseListSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для списка"""
    class Meta:
        model = Expense
        fields = ['id', 'date', 'category', 'amount', 'recipient', 'comment']
