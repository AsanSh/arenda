from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q
from django.db import transaction
from datetime import datetime, timedelta
from decimal import Decimal
from .models import Accrual
from .serializers import AccrualSerializer, AccrualListSerializer
from .services import AccrualService
from payments.models import Payment, PaymentAllocation
from payments.services import PaymentAllocationService
from accounts.models import Account, AccountTransaction
from accounts.services import AccountService
from core.mixins import DataScopingMixin
from core.permissions import ReadOnlyForClients, CanReadResource, CanWriteResource


class AccrualViewSet(DataScopingMixin, viewsets.ModelViewSet):
    """
    ViewSet для управления начислениями с RBAC и data scoping.
    """
    queryset = Accrual.objects.select_related('contract', 'contract__property', 'contract__tenant', 'contract__landlord').all()
    permission_classes = [IsAuthenticated, CanReadResource, ReadOnlyForClients]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'utility_type', 'contract__tenant']
    search_fields = ['contract__number', 'contract__property__name', 'contract__property__address', 'contract__tenant__name']
    ordering_fields = ['due_date', 'final_amount', 'balance', 'period_start', 'contract__tenant__name']
    ordering = ['due_date', 'id']  # Сортировка по сроку оплаты (по возрастанию - сначала ближайшие), затем по ID для стабильности
    pagination_class = None  # Отключаем пагинацию для начислений
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Дополнительная фильтрация по поиску
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(contract__number__icontains=search) |
                Q(contract__property__name__icontains=search) |
                Q(contract__property__address__icontains=search) |
                Q(contract__tenant__name__icontains=search)
            )
        
        # Фильтрация по датам (due_date)
        due_date_from = self.request.query_params.get('due_date_from', None)
        due_date_to = self.request.query_params.get('due_date_to', None)
        
        if due_date_from:
            try:
                due_date_from = datetime.strptime(due_date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(due_date__gte=due_date_from)
            except ValueError:
                pass
        
        if due_date_to:
            try:
                due_date_to = datetime.strptime(due_date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(due_date__lte=due_date_to)
            except ValueError:
                pass
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'list':
            return AccrualListSerializer
        return AccrualSerializer
    
    @action(detail=True, methods=['post'])
    def recalculate(self, request, pk=None):
        """Пересчитать начисление"""
        accrual = self.get_object()
        AccrualService.recalculate_accrual(accrual)
        return Response({'status': 'Начисление пересчитано'})
    
    @action(detail=True, methods=['post'])
    def cancel_payment(self, request, pk=None):
        """
        Отменить оплату начисления.
        Возвращает все суммы из платежей обратно в начисление.
        Удаляет распределения платежей для этого начисления.
        Если нет распределений, просто обнуляет paid_amount.
        """
        accrual = self.get_object()
        
        if accrual.paid_amount <= 0:
            return Response(
                {'error': 'Начисление не оплачено'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Получаем все распределения для этого начисления
                allocations = list(accrual.allocations.select_related('payment').all())
                
                total_returned = Decimal('0')
                
                if allocations:
                    # Есть распределения - удаляем их и обновляем платежи
                    # Группируем распределения по платежам для обновления allocated_amount
                    payments_to_update = {}
                    
                    for allocation in allocations:
                        payment = allocation.payment
                        allocation_amount = allocation.amount
                        
                        # Уменьшаем оплаченную сумму начисления
                        accrual.paid_amount -= allocation_amount
                        total_returned += allocation_amount
                        
                        # Удаляем распределение
                        allocation.delete()
                        
                        # Собираем информацию о платежах для обновления
                        if payment.id not in payments_to_update:
                            payments_to_update[payment.id] = {
                                'payment': payment,
                                'amount_to_subtract': Decimal('0')
                            }
                        payments_to_update[payment.id]['amount_to_subtract'] += allocation_amount
                    
                    # Обновляем платежи (уменьшаем allocated_amount)
                    for payment_data in payments_to_update.values():
                        payment = payment_data['payment']
                        payment.allocated_amount -= payment_data['amount_to_subtract']
                        if payment.allocated_amount < 0:
                            payment.allocated_amount = Decimal('0')
                        payment.save()
                else:
                    # Нет распределений - просто обнуляем paid_amount
                    # Это может быть, если начисление было оплачено напрямую или данные не синхронизированы
                    total_returned = accrual.paid_amount
                    accrual.paid_amount = Decimal('0')
                
                # Пересчитываем начисление (обновит balance и status)
                AccrualService.recalculate_accrual(accrual)
                
                return Response({
                    'status': 'Оплата отменена',
                    'accrual_id': accrual.id,
                    'returned_amount': str(total_returned),
                    'new_balance': str(accrual.balance),
                    'new_status': accrual.status
                })
                
        except Exception as e:
            return Response(
                {'error': f'Ошибка при отмене оплаты: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Получить просроченные начисления"""
        today = timezone.now().date()
        overdue = self.queryset.filter(
            status__in=['due', 'overdue', 'partial'],
            due_date__lt=today
        )
        serializer = self.get_serializer(overdue, many=True)
        return Response(serializer.data)
    

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """
        Принять платеж по начислению.
        Создает платеж с указанной датой и суммой, распределяет его по начислениям.
        
        Параметры:
        - payment_date: дата платежа (по умолчанию сегодня)
        - amount: сумма платежа (по умолчанию баланс начисления)
        - comment: комментарий (опционально)
        """
        accrual = self.get_object()
        
        # Получаем параметры из запроса
        payment_date = request.data.get('payment_date')
        if payment_date:
            try:
                payment_date = datetime.strptime(payment_date, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                payment_date = timezone.now().date()
        else:
            payment_date = timezone.now().date()
        
        amount = request.data.get('amount')
        if amount:
            try:
                amount = Decimal(str(amount))
            except (ValueError, TypeError):
                amount = accrual.balance
        else:
            amount = accrual.balance
        
        comment = request.data.get('comment', '')
        account_id = request.data.get('account')
        
        # Валидация
        if amount <= 0:
            return Response(
                {'error': 'Сумма платежа должна быть больше нуля'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Получаем счет
        if not account_id:
            return Response(
                {'error': 'Необходимо указать счет для поступления'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            account = Account.objects.get(id=account_id, is_active=True)
        except Account.DoesNotExist:
            return Response(
                {'error': 'Счет не найден или неактивен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Создаем платеж
                payment = Payment.objects.create(
                    contract=accrual.contract,
                    account=account,
                    amount=amount,
                    payment_date=payment_date,
                    comment=comment
                )
                
                # Распределяем платеж по начислениям (FIFO)
                allocations = PaymentAllocationService.allocate_payment_fifo(payment)
                
                # Обновляем статусы начислений
                for allocation in allocations:
                    AccrualService.recalculate_accrual(allocation.accrual)
                
                # Создаем транзакцию по счету (поступление)
                AccountService.add_transaction(
                    account=account,
                    transaction_type='income',
                    amount=amount,
                    transaction_date=payment_date,
                    comment=f'Поступление по договору {accrual.contract.number}. {comment}',
                    related_payment=payment,
                    created_by=request.user if hasattr(request, 'user') and request.user.is_authenticated else None
                )
                
                return Response({
                    'status': 'Платеж принят',
                    'payment_id': payment.id,
                    'payment_amount': str(payment.amount),
                    'allocated_amount': str(payment.allocated_amount),
                    'allocations_count': len(allocations)
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response(
                {'error': f'Ошибка при создании платежа: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def update_statuses(self, request):
        """Обновить статусы всех начислений на основе текущей даты"""
        AccrualService.update_all_accrual_statuses()
        return Response({'status': 'Статусы всех начислений обновлены'})
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Массовое обновление начислений"""
        accrual_ids = request.data.get('ids', [])
        if not accrual_ids or not isinstance(accrual_ids, list):
            return Response(
                {'error': 'Необходимо указать список ID начислений для обновления'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Поля, которые можно массово обновить
        update_fields = {}
        allowed_fields = ['due_date', 'base_amount', 'adjustments', 'utilities_amount', 'utility_type', 'comment']
        
        for field in allowed_fields:
            if field in request.data:
                update_fields[field] = request.data[field]
        
        if not update_fields:
            return Response(
                {'error': 'Не указаны поля для обновления'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                accruals = Accrual.objects.filter(id__in=accrual_ids)
                count = accruals.count()
                
                if count != len(accrual_ids):
                    return Response(
                        {'error': f'Найдено только {count} из {len(accrual_ids)} начислений'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Обновляем поля
                for accrual in accruals:
                    for field, value in update_fields.items():
                        if field == 'due_date':
                            try:
                                accrual.due_date = datetime.strptime(value, '%Y-%m-%d').date()
                            except (ValueError, TypeError):
                                pass
                        elif field in ['base_amount', 'adjustments', 'utilities_amount']:
                            try:
                                setattr(accrual, field, Decimal(str(value)))
                            except (ValueError, TypeError):
                                pass
                        else:
                            setattr(accrual, field, value)
                    
                    # Пересчитываем начисление
                    AccrualService.recalculate_accrual(accrual)
                
                return Response({
                    'status': f'Обновлено начислений: {count}',
                    'updated_count': count
                })
        except Exception as e:
            return Response(
                {'error': f'Ошибка при обновлении начислений: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """Массовое удаление начислений"""
        accrual_ids = request.data.get('ids', [])
        if not accrual_ids or not isinstance(accrual_ids, list):
            return Response(
                {'error': 'Необходимо указать список ID начислений для удаления'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                accruals = Accrual.objects.filter(id__in=accrual_ids)
                count = accruals.count()
                
                # Проверяем, что все начисления существуют
                if count != len(accrual_ids):
                    return Response(
                        {'error': f'Найдено только {count} из {len(accrual_ids)} начислений'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                accruals.delete()
                return Response({
                    'status': f'Удалено начислений: {count}',
                    'deleted_count': count
                })
        except Exception as e:
            return Response(
                {'error': f'Ошибка при удалении начислений: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def bulk_accept(self, request):
        """
        Массовое принятие платежей по начислениям.
        Создает платежи для каждого начисления с указанной датой и суммой.
        
        Параметры:
        - accrual_ids: список ID начислений
        - payment_date: дата платежа (по умолчанию сегодня)
        - amounts: словарь {accrual_id: amount} или общая сумма для всех
        - comment: комментарий (опционально)
        """
        accrual_ids = request.data.get('accrual_ids', [])
        if not accrual_ids or not isinstance(accrual_ids, list):
            return Response(
                {'error': 'Необходимо указать список ID начислений'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        payment_date = request.data.get('payment_date')
        if payment_date:
            try:
                payment_date = datetime.strptime(payment_date, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                payment_date = timezone.now().date()
        else:
            payment_date = timezone.now().date()
        
        amounts = request.data.get('amounts', {})  # Словарь {accrual_id: amount}
        comment = request.data.get('comment', '')
        account_id = request.data.get('account')
        
        # Получаем счет
        if not account_id:
            return Response(
                {'error': 'Необходимо указать счет для поступления'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            account = Account.objects.get(id=account_id, is_active=True)
        except Account.DoesNotExist:
            return Response(
                {'error': 'Счет не найден или неактивен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                accruals = Accrual.objects.filter(id__in=accrual_ids).select_related('contract')
                if accruals.count() != len(accrual_ids):
                    return Response(
                        {'error': 'Некоторые начисления не найдены'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                payments_created = []
                total_allocations = 0
                total_amount = Decimal('0')
                
                for accrual in accruals:
                    # Определяем сумму платежа
                    if isinstance(amounts, dict) and accrual.id in amounts:
                        amount = Decimal(str(amounts[accrual.id]))
                    else:
                        # Используем баланс начисления
                        amount = accrual.balance
                    
                    if amount <= 0:
                        continue
                    
                    # Создаем платеж
                    payment = Payment.objects.create(
                        contract=accrual.contract,
                        account=account,
                        amount=amount,
                        payment_date=payment_date,
                        comment=comment or f'Массовое принятие начисления #{accrual.id}'
                    )
                    
                    total_amount += amount
                    
                    # Распределяем платеж по начислениям (FIFO)
                    allocations = PaymentAllocationService.allocate_payment_fifo(payment)
                    total_allocations += len(allocations)
                    
                    # Обновляем статусы начислений
                    for allocation in allocations:
                        AccrualService.recalculate_accrual(allocation.accrual)
                    
                    payments_created.append(payment.id)
                
                # Создаем одну транзакцию по счету для всех платежей
                if total_amount > 0:
                    AccountService.add_transaction(
                        account=account,
                        transaction_type='income',
                        amount=total_amount,
                        transaction_date=payment_date,
                        comment=f'Массовое поступление по {len(payments_created)} начислениям. {comment}',
                        created_by=request.user if hasattr(request, 'user') and request.user.is_authenticated else None
                    )
                
                return Response({
                    'status': f'Создано платежей: {len(payments_created)}',
                    'payments_created': len(payments_created),
                    'total_allocations': total_allocations,
                    'total_amount': str(total_amount)
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response(
                {'error': f'Ошибка при массовом принятии платежей: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )