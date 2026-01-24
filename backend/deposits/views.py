from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from decimal import Decimal
from .models import Deposit, DepositMovement
from .serializers import DepositSerializer, DepositListSerializer, DepositMovementSerializer
from core.mixins import DataScopingMixin
from core.permissions import ReadOnlyForClients


class DepositViewSet(DataScopingMixin, viewsets.ModelViewSet):
    """
    ViewSet для управления депозитами с RBAC и data scoping.
    """
    queryset = Deposit.objects.select_related('contract', 'contract__property', 'contract__tenant', 'contract__landlord').all()
    permission_classes = [IsAuthenticated, ReadOnlyForClients]
    filter_backends = []
    
    def get_serializer_class(self):
        if self.action == 'list':
            return DepositListSerializer
        return DepositSerializer
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def accept(self, request, pk=None):
        """Принять депозит"""
        deposit = self.get_object()
        amount = Decimal(str(request.data.get('amount', 0)))
        
        if amount <= 0:
            return Response({'error': 'Сумма должна быть больше 0'}, status=status.HTTP_400_BAD_REQUEST)
        
        deposit.balance += amount
        deposit.save()
        
        DepositMovement.objects.create(
            deposit=deposit,
            movement_type='in',
            amount=amount,
            comment=request.data.get('comment', '')
        )
        
        return Response({'status': 'Депозит принят', 'balance': deposit.balance})
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def withdraw(self, request, pk=None):
        """Списать с депозита"""
        deposit = self.get_object()
        amount = Decimal(str(request.data.get('amount', 0)))
        reason = request.data.get('reason', 'other')
        
        if amount <= 0:
            return Response({'error': 'Сумма должна быть больше 0'}, status=status.HTTP_400_BAD_REQUEST)
        
        if amount > deposit.balance:
            return Response(
                {'error': 'Недостаточно средств на депозите'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        deposit.balance -= amount
        deposit.save()
        
        DepositMovement.objects.create(
            deposit=deposit,
            movement_type='out',
            amount=amount,
            reason=reason,
            comment=request.data.get('comment', '')
        )
        
        return Response({'status': 'Депозит списан', 'balance': deposit.balance})
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def refund(self, request, pk=None):
        """Вернуть депозит"""
        deposit = self.get_object()
        
        if deposit.balance <= 0:
            return Response({'error': 'Нет средств для возврата'}, status=status.HTTP_400_BAD_REQUEST)
        
        refund_amount = deposit.balance
        deposit.balance = Decimal('0')
        deposit.save()
        
        DepositMovement.objects.create(
            deposit=deposit,
            movement_type='refund',
            amount=refund_amount,
            comment=request.data.get('comment', 'Возврат депозита')
        )
        
        return Response({'status': 'Депозит возвращен', 'amount': refund_amount})
