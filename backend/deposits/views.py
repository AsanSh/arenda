from decimal import Decimal

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Deposit
from .serializers import DepositSerializer, DepositListSerializer, DepositMovementSerializer
from .services import DepositService
from core.mixins import DataScopingMixin
from core.permissions import ReadOnlyForClients


class DepositViewSet(DataScopingMixin, viewsets.ModelViewSet):
    """ViewSet для управления депозитами с RBAC и data scoping."""
    queryset = Deposit.objects.select_related(
        "contract", "contract__property", "contract__tenant", "contract__landlord"
    ).all()
    permission_classes = [IsAuthenticated, ReadOnlyForClients]
    filter_backends = []

    def get_serializer_class(self):
        if self.action == "list":
            return DepositListSerializer
        return DepositSerializer

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        """Принять депозит"""
        deposit = self.get_object()
        amount = Decimal(str(request.data.get("amount", 0)))
        comment = request.data.get("comment", "")
        try:
            balance = DepositService.accept_deposit(deposit, amount, comment)
            return Response({"status": "Депозит принят", "balance": balance})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def withdraw(self, request, pk=None):
        """Списать с депозита"""
        deposit = self.get_object()
        amount = Decimal(str(request.data.get("amount", 0)))
        reason = request.data.get("reason", "other")
        comment = request.data.get("comment", "")
        try:
            balance = DepositService.withdraw_deposit(deposit, amount, reason, comment)
            return Response({"status": "Депозит списан", "balance": balance})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def refund(self, request, pk=None):
        """Вернуть депозит"""
        deposit = self.get_object()
        comment = request.data.get("comment", "")
        try:
            amount = DepositService.refund_deposit(deposit, comment)
            return Response({"status": "Депозит возвращен", "amount": amount})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
