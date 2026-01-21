from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q
from decimal import Decimal
from .models import Expense
from .serializers import ExpenseSerializer, ExpenseListSerializer
from payments.models import Payment


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления выплатами/расходами.
    """
    queryset = Expense.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ExpenseListSerializer
        return ExpenseSerializer


class AccountViewSet(viewsets.ViewSet):
    """
    ViewSet для работы со счетом (баланс, движение средств).
    """
    
    @action(detail=False, methods=['get'])
    def balance(self, request):
        """Получить текущий баланс счета"""
        # Сумма всех поступлений
        total_income = Payment.objects.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        
        # Сумма всех расходов
        total_expenses = Expense.objects.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        
        balance = total_income - total_expenses
        
        return Response({
            'balance': balance,
            'total_income': total_income,
            'total_expenses': total_expenses
        })
    
    @action(detail=False, methods=['get'])
    def ledger(self, request):
        """Получить ленту движений (поступления и расходы)"""
        from payments.serializers import PaymentListSerializer
        from .serializers import ExpenseListSerializer
        
        payments = Payment.objects.all()[:50]
        expenses = Expense.objects.all()[:50]
        
        return Response({
            'payments': PaymentListSerializer(payments, many=True).data,
            'expenses': ExpenseListSerializer(expenses, many=True).data
        })
