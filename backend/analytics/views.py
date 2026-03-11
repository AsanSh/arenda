"""
Property Analytics API.
FEATURE_ANALYTICS: регистрируется только когда feature включён.
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import get_property_analytics


class PropertyAnalyticsViewSet(viewsets.ViewSet):
    """Analytics API. TODO: применить DataScoping по property/contract для staff/landlord/investor."""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Сводка по объектам или по одному объекту."""
        property_id = request.query_params.get('property_id', type=int)
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        data = get_property_analytics(property_id=property_id, from_date=from_date, to_date=to_date)
        return Response(data)
