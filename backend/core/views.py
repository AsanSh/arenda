from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Tenant, ExchangeRate, Request
from .serializers import TenantSerializer, ExchangeRateSerializer, RequestSerializer, RequestListSerializer
from .services import ExchangeRateService
from .mixins import DataScopingMixin
from .permissions import ReadOnlyForClients, CanReadResource, CanWriteResource


class TenantViewSet(DataScopingMixin, viewsets.ModelViewSet):
    """ViewSet для управления контрагентами с RBAC"""
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated, CanReadResource, CanWriteResource]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type', 'phone']
    search_fields = ['name', 'email', 'phone', 'contact_person']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def perform_destroy(self, instance):
        """Защита от удаления суперадмина"""
        if instance.type == 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Нельзя удалить администратора системы. Это суперадмин.")
        super().perform_destroy(instance)
    
    def get_queryset(self):
        """Применяем data scoping"""
        queryset = super().get_queryset()
        phone = self.request.query_params.get('phone', None)
        
        if phone:
            # Нормализуем номер телефона (убираем все нецифровые символы)
            normalized_phone = ''.join(filter(str.isdigit, phone))
            
            # Создаем все возможные варианты для поиска
            search_phones = set()
            
            # Добавляем исходный номер и нормализованный
            search_phones.add(phone)
            search_phones.add(normalized_phone)
            
            # Если номер начинается с 996 (12 цифр)
            if normalized_phone.startswith('996') and len(normalized_phone) >= 12:
                # Полный номер с 996
                search_phones.add(normalized_phone)
                # Без 996 (9 цифр)
                search_phones.add(normalized_phone[3:])
                # С плюсом
                search_phones.add(f"+{normalized_phone}")
                search_phones.add(f"+996{normalized_phone[3:]}")
            # Если номер из 9 цифр (без 996)
            elif len(normalized_phone) == 9:
                search_phones.add(normalized_phone)
                search_phones.add(f"996{normalized_phone}")
                search_phones.add(f"+996{normalized_phone}")
                search_phones.add(f"+{normalized_phone}")
            
            # Также добавляем варианты с исходным форматом (если был +)
            if phone.startswith('+'):
                search_phones.add(phone[1:])  # Без +
                search_phones.add(phone.replace('+', ''))  # Без + (все нецифровые)
            
            # Ищем контрагента по телефону (с учетом разных форматов)
            # Используем OR для поиска по любому из вариантов
            query = Q()
            
            # Нормализуем все номера в базе для сравнения (убираем все нецифровые символы)
            # Это позволит найти "+996557903999" при поиске "996557903999"
            normalized_input = normalized_phone
            
            # Создаем все возможные нормализованные варианты для поиска
            normalized_variants = set()
            normalized_variants.add(normalized_input)
            
            if normalized_input.startswith('996') and len(normalized_input) >= 12:
                # Если номер с 996 (12 цифр), добавляем вариант без 996
                normalized_variants.add(normalized_input[3:])
            elif len(normalized_input) == 9:
                # Если номер без 996 (9 цифр), добавляем вариант с 996
                normalized_variants.add(f"996{normalized_input}")
            
            # Ищем по всем вариантам из search_phones (точное и частичное совпадение)
            for search_phone in search_phones:
                if search_phone and len(search_phone) >= 9:
                    # Точное совпадение
                    query |= Q(phone=search_phone)
                    # Частичное совпадение (содержит)
                    query |= Q(phone__icontains=search_phone)
            
            # Дополнительно ищем по нормализованным версиям
            for norm_variant in normalized_variants:
                if norm_variant and len(norm_variant) >= 9:
                    # Ищем номера, которые содержат эту последовательность цифр
                    query |= Q(phone__icontains=norm_variant)
            
            queryset = queryset.filter(query).distinct()
            
            # Логируем для отладки
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Phone search: input={phone}, normalized={normalized_phone}, variants={list(search_phones)}, normalized_variants={list(normalized_variants)}, found={queryset.count()}")
        
        return queryset


class ExchangeRateViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для работы с курсами валют"""
    queryset = ExchangeRate.objects.all()
    serializer_class = ExchangeRateSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def update_rates(self, request):
        """Обновить курсы валют с valuta.kg"""
        rates = ExchangeRateService.update_rates()
        return Response({'status': 'Курсы обновлены', 'rates': rates})
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Получить текущие курсы"""
        source = request.query_params.get('source', 'nbkr')
        from datetime import date
        today = date.today()
        
        rates = ExchangeRate.objects.filter(date=today, source=source)
        serializer = self.get_serializer(rates, many=True)
        return Response(serializer.data)


class RequestViewSet(DataScopingMixin, viewsets.ModelViewSet):
    """ViewSet для управления заявками"""
    queryset = Request.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type', 'status', 'assigned_to']
    search_fields = ['subject', 'message']
    ordering_fields = ['created_at', 'updated_at', 'status']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Используем упрощенный сериализатор для списка"""
        if self.action == 'list':
            return RequestListSerializer
        return RequestSerializer
    
    def get_queryset(self):
        """Применяем data scoping для заявок"""
        queryset = super().get_queryset()
        user = self.request.user
        
        # Admin и Staff видят все заявки
        if user.role in ['admin', 'staff']:
            return queryset
        
        # Клиенты видят только свои заявки
        if user.role in ['tenant', 'landlord', 'investor']:
            return queryset.filter(created_by=user)
        
        return queryset.none()
    
    def perform_create(self, serializer):
        """Автоматически устанавливаем created_by и role"""
        serializer.save(
            created_by=self.request.user,
            role=self.request.user.role,
            counterparty=self.request.user.counterparty
        )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reply(self, request, pk=None):
        """Добавить ответ к заявке (клиент может дополнять, staff/admin может отвечать)"""
        request_obj = self.get_object()
        user = request.user
        message = request.data.get('message', '')
        
        if not message:
            return Response({'error': 'Сообщение обязательно'}, status=400)
        
        # Клиент может дополнять только свои заявки
        if user.role in ['tenant', 'landlord', 'investor']:
            if request_obj.created_by != user:
                return Response({'error': 'Доступ запрещен'}, status=403)
            if request_obj.status in ['DONE', 'REJECTED']:
                return Response({'error': 'Заявка закрыта'}, status=400)
            # Добавляем сообщение к существующему
            request_obj.message += f"\n\n--- Дополнение от {user.username} ---\n{message}"
            request_obj.save()
        
        # Staff/Admin могут отвечать публично
        elif user.role in ['admin', 'staff']:
            request_obj.public_reply = message
            if 'status' in request.data:
                request_obj.status = request.data['status']
            if 'internal_comment' in request.data:
                request_obj.internal_comment = request.data['internal_comment']
            if 'assigned_to' in request.data:
                request_obj.assigned_to_id = request.data['assigned_to']
            request_obj.save()
        
        serializer = self.get_serializer(request_obj)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def assign(self, request, pk=None):
        """Назначить заявку сотруднику (только для admin/staff)"""
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Доступ запрещен'}, status=403)
        
        request_obj = self.get_object()
        assigned_to_id = request.data.get('assigned_to')
        
        if assigned_to_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                assigned_user = User.objects.get(id=assigned_to_id, role__in=['admin', 'staff'])
                request_obj.assigned_to = assigned_user
                request_obj.save()
            except User.DoesNotExist:
                return Response({'error': 'Пользователь не найден'}, status=404)
        
        serializer = self.get_serializer(request_obj)
        return Response(serializer.data)
