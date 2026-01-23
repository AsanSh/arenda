from rest_framework import serializers
from .models import AuthSession, Tenant


class InitSessionSerializer(serializers.Serializer):
    """Сериализатор для инициализации сессии"""
    session_id = serializers.CharField(read_only=True)


class CheckStatusSerializer(serializers.Serializer):
    """Сериализатор для проверки статуса сессии"""
    status = serializers.CharField(read_only=True)
    token = serializers.CharField(read_only=True, required=False)
    role = serializers.CharField(read_only=True, required=False)
    user_id = serializers.IntegerField(read_only=True, required=False)
    user_name = serializers.CharField(read_only=True, required=False)


class WebhookSerializer(serializers.Serializer):
    """Сериализатор для webhook от Green API"""
    typeWebhook = serializers.CharField(required=False)
    instanceData = serializers.DictField(required=False)
    timestamp = serializers.IntegerField(required=False)
    idMessage = serializers.CharField(required=False)
    senderData = serializers.DictField(required=False)
    messageData = serializers.DictField(required=False)
