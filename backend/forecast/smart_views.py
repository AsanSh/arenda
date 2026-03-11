"""
Smart Forecast API.
Отдельный endpoint. Не меняет текущий forecast.
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from .smart_services import get_smart_forecast


class SmartForecastViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def calculate(self, request):
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        days = int(request.query_params.get('days', 90))
        today = timezone.now().date()

        if from_date and to_date:
            try:
                from datetime import datetime
                from_date = datetime.strptime(from_date, '%Y-%m-%d').date()
                to_date = datetime.strptime(to_date, '%Y-%m-%d').date()
            except ValueError:
                from_date = today
                to_date = today + timedelta(days=days)
        else:
            from_date = today
            to_date = today + timedelta(days=days)

        data = get_smart_forecast(from_date=from_date, to_date=to_date)

        base_total = sum(float(r['base_expected']) for r in data)
        smart_total = sum(float(r['smart_expected']) for r in data)
        high_risk_amount = sum(float(r['smart_expected']) for r in data if r['risk_score'] > 50)

        return Response({
            'items': data,
            'summary': {
                'base_expected_total': str(base_total),
                'smart_expected_total': str(smart_total),
                'delta': str(smart_total - base_total),
                'high_risk_amount': str(high_risk_amount),
                'from_date': str(from_date),
                'to_date': str(to_date),
            },
        })
