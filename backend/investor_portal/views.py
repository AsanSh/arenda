"""
Investor Portal API.
FEATURE_INVESTOR_PORTAL: доступно когда feature включён.
Пока пустой — foundation для будущего.
"""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


class InvestorDashboardViewSet(viewsets.ViewSet):
    """Заглушка: список объектов, доступных инвестору. TODO: реализовать с DataScoping."""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        # Пока возвращаем пустой список. Реализация через InvestorLink.
        return Response({'properties': [], 'positions': [], 'payouts': []})
