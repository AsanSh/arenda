from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Tenant, ExchangeRate
from .serializers import TenantSerializer, ExchangeRateSerializer
from .services import ExchangeRateService


class TenantViewSet(viewsets.ModelViewSet):
    """ViewSet для управления контрагентами"""
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type', 'phone']
    search_fields = ['name', 'email', 'phone', 'contact_person']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
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
            # Это критично для случаев, когда в базе "+996557903999", а ищем "996557903999"
            # Используем более простой подход - ищем по последовательности цифр
            for norm_variant in normalized_variants:
                if norm_variant and len(norm_variant) >= 9:
                    # Ищем номера, которые содержат эту последовательность цифр
                    # Это найдет "+996557903999" при поиске "996557903999"
                    # Используем icontains для поиска подстроки
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
