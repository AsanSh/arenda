from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from decimal import Decimal
from .models import Account, AccountTransaction
from .serializers import (
    AccountSerializer, AccountListSerializer,
    AccountTransactionSerializer, AccountTransactionListSerializer
)
from .services import AccountService


class AccountViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления счетами.
    """
    queryset = Account.objects.select_related('owner').all()
    filter_backends = []
    
    def get_serializer_class(self):
        if self.action == 'list':
            return AccountListSerializer
        return AccountSerializer
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def add_income(self, request, pk=None):
        """Добавить поступление на счет"""
        account = self.get_object()
        amount = Decimal(str(request.data.get('amount', 0)))
        transaction_date = request.data.get('transaction_date')
        comment = request.data.get('comment', '')
        
        if amount <= 0:
            return Response({'error': 'Сумма должна быть больше 0'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            acc_transaction = AccountService.add_transaction(
                account=account,
                transaction_type='income',
                amount=amount,
                transaction_date=transaction_date,
                comment=comment,
                created_by=request.user if hasattr(request, 'user') else None
            )
            serializer = AccountTransactionSerializer(acc_transaction)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def add_expense(self, request, pk=None):
        """Добавить расход со счета"""
        account = self.get_object()
        amount = Decimal(str(request.data.get('amount', 0)))
        transaction_date = request.data.get('transaction_date')
        comment = request.data.get('comment', '')
        
        if amount <= 0:
            return Response({'error': 'Сумма должна быть больше 0'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            acc_transaction = AccountService.add_transaction(
                account=account,
                transaction_type='expense',
                amount=amount,
                transaction_date=transaction_date,
                comment=comment,
                created_by=request.user if hasattr(request, 'user') else None
            )
            serializer = AccountTransactionSerializer(acc_transaction)
            return Response(serializer.data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def transfer(self, request, pk=None):
        """Перевести средства на другой счет"""
        account_from = self.get_object()
        account_to_id = request.data.get('account_to')
        amount = Decimal(str(request.data.get('amount', 0)))
        transaction_date = request.data.get('transaction_date')
        comment = request.data.get('comment', '')
        
        if amount <= 0:
            return Response({'error': 'Сумма должна быть больше 0'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not account_to_id:
            return Response({'error': 'Не указан счет получателя'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            account_to = Account.objects.get(id=account_to_id)
            
            if account_from.currency != account_to.currency:
                return Response(
                    {'error': 'Нельзя переводить между счетами с разной валютой'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            acc_transaction = AccountService.add_transaction(
                account=account_from,
                transaction_type='transfer_out',
                amount=amount,
                transaction_date=transaction_date,
                comment=comment or f'Перевод на счет {account_to.name}',
                related_account=account_to,
                created_by=request.user if hasattr(request, 'user') else None
            )
            serializer = AccountTransactionSerializer(acc_transaction)
            return Response(serializer.data)
        except Account.DoesNotExist:
            return Response({'error': 'Счет получателя не найден'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def transactions(self, request, pk=None):
        """Получить операции по счету"""
        account = self.get_object()
        transactions = AccountTransaction.objects.filter(account=account).order_by('-transaction_date')
        serializer = AccountTransactionListSerializer(transactions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def total_balance(self, request):
        """Получить общий баланс по валютам"""
        currency = request.query_params.get('currency', 'KGS')
        total = AccountService.get_total_balance(currency)
        return Response({'currency': currency, 'total_balance': total})


class AccountTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для просмотра операций по счетам.
    """
    queryset = AccountTransaction.objects.select_related('account', 'related_account').all()
    
    def get_serializer_class(self):
        if self.action == 'list':
            return AccountTransactionListSerializer
        return AccountTransactionSerializer
