from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.db import transaction
from .models import Payment, PaymentAllocation
from .serializers import PaymentSerializer, PaymentListSerializer
from .services import PaymentAllocationService
from accruals.models import Accrual
from accruals.services import AccrualService
from accounts.models import AccountTransaction
from accounts.services import AccountService


class PaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления поступлениями.
    При создании автоматически распределяет платеж по начислениям (FIFO).
    """
    queryset = Payment.objects.select_related('contract', 'contract__property', 'contract__tenant').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['contract', 'contract__property', 'contract__tenant']
    search_fields = ['contract__number', 'contract__property__name', 'contract__tenant__name']
    ordering_fields = ['payment_date', 'created_at', 'amount']
    ordering = ['-payment_date', '-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PaymentListSerializer
        return PaymentSerializer
    
    def perform_create(self, serializer):
        payment = serializer.save()
        
        # Проверяем, есть ли начисления для договора
        accruals_count = Accrual.objects.filter(contract=payment.contract).count()
        if accruals_count == 0:
            # Если начислений нет, создаем их автоматически
            AccrualService.generate_accruals_for_contract(payment.contract)
        
        # Автоматическое распределение по начислениям
        PaymentAllocationService.allocate_payment_fifo(payment)
    
    @action(detail=True, methods=['post'])
    def reallocate(self, request, pk=None):
        """Перераспределить платеж"""
        payment = self.get_object()
        PaymentAllocationService.reallocate_payment(payment)
        return Response({'status': 'Платеж перераспределен'})
    
    @action(detail=True, methods=['get'])
    def allocations(self, request, pk=None):
        """Получить распределения платежа"""
        payment = self.get_object()
        allocations = payment.allocations.select_related('accrual').all()
        from .serializers import PaymentAllocationSerializer
        serializer = PaymentAllocationSerializer(allocations, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def return_payment(self, request, pk=None):
        """
        Вернуть платеж обратно в начисления.
        Откатывает распределение платежа, но не удаляет сам платеж.
        Платеж помечается как возвращенный (is_returned=True).
        """
        payment = self.get_object()
        
        if payment.is_returned:
            return Response(
                {'error': 'Платеж уже был возвращен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Получаем все распределения платежа
                allocations = list(payment.allocations.select_related('accrual').all())
                
                if not allocations:
                    return Response(
                        {'error': 'Нет распределений для отката'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Возвращаем суммы в начисления
                for allocation in allocations:
                    accrual = allocation.accrual
                    allocation_amount = allocation.amount
                    
                    # Уменьшаем оплаченную сумму на сумму распределения
                    new_paid_amount = accrual.paid_amount - allocation_amount
                    accrual.paid_amount = max(Decimal('0'), new_paid_amount)
                    
                    # Пересчитываем начисление (обновит balance и status)
                    AccrualService.recalculate_accrual(accrual)
                
                # Откатываем транзакции по счету
                account_transactions = AccountTransaction.objects.filter(
                    related_payment=payment
                ).select_related('account')
                
                for acc_transaction in account_transactions:
                    account = acc_transaction.account
                    # Откатываем транзакцию: если это поступление (income), уменьшаем баланс
                    if acc_transaction.transaction_type == 'income':
                        new_balance = account.balance - acc_transaction.amount
                        account.balance = max(Decimal('0'), new_balance)
                        account.save()
                    # Удаляем транзакцию
                    acc_transaction.delete()
                
                # Удаляем распределения
                for allocation in allocations:
                    allocation.delete()
                
                # Помечаем платеж как возвращенный
                payment.is_returned = True
                payment.allocated_amount = Decimal('0')
                payment.comment = (payment.comment or '') + ' [ВОЗВРАЩЕН]'
                payment.save()
                
                return Response({
                    'status': 'Платеж возвращен',
                    'payment_id': payment.id,
                    'returned_amount': str(sum(a.amount for a in allocations))
                })
                
        except Exception as e:
            return Response(
                {'error': f'Ошибка при возврате платежа: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def perform_destroy(self, instance):
        """
        Переопределяем удаление платежа для корректной обработки:
        1. Возвращаем суммы в начисления (уменьшаем paid_amount)
        2. Пересчитываем начисления
        3. Откатываем транзакции по счету (уменьшаем баланс)
        4. Удаляем платеж
        """
        with transaction.atomic():
            # Получаем все распределения платежа
            allocations = list(instance.allocations.select_related('accrual').all())
            
            # Возвращаем суммы в начисления
            for allocation in allocations:
                accrual = allocation.accrual
                # Уменьшаем оплаченную сумму на сумму распределения
                allocation_amount = allocation.amount
                
                # Уменьшаем оплаченную сумму на сумму распределения
                # Убеждаемся, что paid_amount не становится отрицательным
                new_paid_amount = accrual.paid_amount - allocation_amount
                accrual.paid_amount = max(Decimal("0"), new_paid_amount)
                # Пересчитываем начисление (обновит balance и status)
                AccrualService.recalculate_accrual(accrual)
            
            # Откатываем транзакции по счету
            # Получаем все транзакции, связанные с этим платежом
            account_transactions = AccountTransaction.objects.filter(
                related_payment=instance
            ).select_related('account')
            
            for acc_transaction in account_transactions:
                account = acc_transaction.account
                # Откатываем транзакцию: если это поступление (income), уменьшаем баланс
                if acc_transaction.transaction_type == 'income':
                    account.balance -= acc_transaction.amount
                    account.save()
                # Удаляем транзакцию
                acc_transaction.delete()
            
            # Удаляем платеж (это автоматически удалит все PaymentAllocation через CASCADE)
            instance.delete()