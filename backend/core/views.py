from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Tenant, ExchangeRate
from .serializers import TenantSerializer, ExchangeRateSerializer
from .services import ExchangeRateService


class TenantViewSet(viewsets.ModelViewSet):
    """ViewSet для управления контрагентами"""
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer


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
