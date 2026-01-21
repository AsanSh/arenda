from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from .models import NotificationSettings, NotificationLog
from .serializers import NotificationSettingsSerializer, NotificationLogSerializer
from .services import NotificationService
from accruals.models import Accrual


class NotificationSettingsViewSet(viewsets.ModelViewSet):
    """ViewSet для управления настройками уведомлений"""
    queryset = NotificationSettings.objects.all()
    serializer_class = NotificationSettingsSerializer
    
    def get_queryset(self):
        # Всегда возвращаем единственную запись настроек
        return NotificationSettings.objects.all()
    
    def list(self, request, *args, **kwargs):
        """Получить настройки (singleton)"""
        settings = NotificationSettings.get_settings()
        serializer = self.get_serializer(settings)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Создать или обновить настройки"""
        settings = NotificationSettings.get_settings()
        serializer = self.get_serializer(settings, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """Обновить настройки"""
        settings = NotificationSettings.get_settings()
        serializer = self.get_serializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def send_test(self, request):
        """Отправить тестовое уведомление"""
        settings = NotificationSettings.get_settings()
        tenant_id = request.data.get('tenant_id')
        
        if not tenant_id:
            return Response(
                {'error': 'Не указан tenant_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from core.models import Tenant
        try:
            tenant = Tenant.objects.get(pk=tenant_id)
        except Tenant.DoesNotExist:
            return Response(
                {'error': 'Контрагент не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Находим первое начисление для теста
        accrual = Accrual.objects.filter(
            contract__tenant=tenant,
            balance__gt=0
        ).first()
        
        if not accrual:
            return Response(
                {'error': 'Нет начислений для тестирования'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Отправляем тестовое уведомление
        success = NotificationService.send_notification(accrual)
        
        if success:
            return Response({'status': 'Тестовое уведомление отправлено'})
        else:
            return Response(
                {'error': 'Не удалось отправить уведомление'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def send_all(self, request):
        """Отправить все ожидающие уведомления"""
        sent_count = NotificationService.send_pending_notifications()
        return Response({
            'status': 'Рассылка выполнена',
            'sent_count': sent_count
        })


class NotificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для просмотра логов уведомлений"""
    queryset = NotificationLog.objects.all().select_related('accrual', 'tenant')
    serializer_class = NotificationLogSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Фильтры
        tenant_id = self.request.query_params.get('tenant_id')
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        
        accrual_id = self.request.query_params.get('accrual_id')
        if accrual_id:
            queryset = queryset.filter(accrual_id=accrual_id)
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        notification_type = self.request.query_params.get('notification_type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        return queryset
