from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.db import transaction
from datetime import datetime
from .models import Contract
from .serializers import ContractSerializer, ContractListSerializer
from decimal import Decimal
from accruals.models import Accrual
from accruals.services import AccrualService
from deposits.models import Deposit
from payments.models import Payment, PaymentAllocation
from payments.services import PaymentAllocationService


class ContractViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления договорами.
    При создании автоматически генерирует начисления.
    """
    queryset = Contract.objects.select_related('property', 'tenant').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'property', 'tenant']
    search_fields = ['number', 'property__name', 'tenant__name']
    ordering_fields = ['created_at', 'start_date', 'end_date']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ContractListSerializer
        return ContractSerializer
    
    def generate_contract_number(self):
        """Генерация номера договора: AMT-YYYY-XXXXXX"""
        year = datetime.now().year
        last_contract = Contract.objects.filter(number__startswith=f'AMT-{year}').order_by('-number').first()
        
        if last_contract:
            try:
                last_num = int(last_contract.number.split('-')[-1])
                new_num = last_num + 1
            except (ValueError, IndexError):
                new_num = 1
        else:
            new_num = 1
        
        return f"AMT-{year}-{new_num:06d}"
    
    def perform_create(self, serializer):
        # Генерируем номер договора
        if not serializer.validated_data.get('number'):
            serializer.validated_data['number'] = self.generate_contract_number()
        
        contract = serializer.save()
        
        # Автоматическая генерация начислений
        AccrualService.generate_accruals_for_contract(contract)
        
        # Создание депозита, если включен
        if contract.deposit_enabled:
            from accounts.models import Account
            # Находим счет по контрагенту и валюте
            account = Account.objects.filter(
                owner=contract.tenant,
                currency=contract.currency,
                is_active=True
            ).first()
            
            # Если счета нет, создаем общий счет для контрагента
            if not account:
                account = Account.objects.create(
                    name=f"{contract.tenant.name} ({contract.get_currency_display()})",
                    account_type='bank',
                    currency=contract.currency,
                    owner=contract.tenant,
                    is_active=True
                )
            
            Deposit.objects.create(
                contract=contract,
                amount=contract.deposit_amount,
                balance=Decimal('0')
            )
            
            # Увеличиваем баланс счета на сумму депозита
            account.balance += contract.deposit_amount
            account.save()
        
        # Создание аванса, если включен
        if contract.advance_enabled:
            advance_amount = contract.rent_amount * contract.advance_months
            payment = Payment.objects.create(
                contract=contract,
                amount=advance_amount,
                payment_date=contract.start_date,
                comment='Аванс'
            )
            # Распределение аванса по первым начислениям
            PaymentAllocationService.allocate_payment_fifo(payment)
    
    def perform_update(self, serializer):
        """При обновлении договора проверяем, нужно ли создать начисления"""
        old_contract = Contract.objects.get(pk=serializer.instance.pk)
        old_status = old_contract.status
        old_rent_amount = old_contract.rent_amount
        old_start_date = old_contract.start_date
        old_end_date = old_contract.end_date
        
        contract = serializer.save()
        
        # Если статус изменился на active и начислений нет - создаем их
        if contract.status == 'active' and old_status != 'active':
            accruals_count = Accrual.objects.filter(contract=contract).count()
            if accruals_count == 0:
                AccrualService.generate_accruals_for_contract(contract)
        # Если изменилась ставка аренды - исправляем planned начисления
        elif old_rent_amount != contract.rent_amount:
            AccrualService.fix_accruals_for_contract(contract)
        # Если изменились даты - пересоздаем planned начисления
        elif (old_start_date != contract.start_date or old_end_date != contract.end_date):
            Accrual.objects.filter(contract=contract, status='planned').delete()
            AccrualService.generate_accruals_for_contract(contract)
    
    def destroy(self, request, *args, **kwargs):
        """Переопределяем destroy для каскадного удаления всех связанных операций"""
        instance = self.get_object()
        
        try:
            with transaction.atomic():
                # Подсчитываем что будет удалено (для информативности)
                accruals_count = Accrual.objects.filter(contract=instance).count()
                payments_count = Payment.objects.filter(contract=instance).count()
                deposits_count = Deposit.objects.filter(contract=instance).exists()
                
                # Получаем ID платежей перед удалением
                payment_ids = list(Payment.objects.filter(contract=instance).values_list('id', flat=True))
                
                # Удаляем PaymentAllocation (они связаны с Payment через CASCADE, 
                # но лучше удалить явно для ясности)
                if payment_ids:
                    PaymentAllocation.objects.filter(payment_id__in=payment_ids).delete()
                
                # Удаляем Payment (они имеют PROTECT, поэтому удаляем вручную)
                Payment.objects.filter(contract=instance).delete()
                
                # Accrual удалятся автоматически (CASCADE в модели)
                # Deposit удалится автоматически (CASCADE в модели)
                # Expense останется, но contract будет NULL (SET_NULL в модели)
                
                # Удаляем сам договор
                contract_number = instance.number
                instance.delete()
                
            return Response(
                {
                    'message': f'Договор "{contract_number}" и все связанные операции успешно удалены. '
                              f'Удалено: {accruals_count} начислений, {payments_count} платежей, {1 if deposits_count else 0} депозитов.'
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': f'Ошибка при удалении договора: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def end_contract(self, request, pk=None):
        """Завершить договор"""
        contract = self.get_object()
        contract.status = 'ended'
        contract.save()
        return Response({'status': 'Договор завершён'})
    
    @action(detail=True, methods=['post'])
    def generate_accruals(self, request, pk=None):
        """Вручную сгенерировать начисления для договора"""
        contract = self.get_object()
        AccrualService.generate_accruals_for_contract(contract)
        return Response({'status': 'Начисления сгенерированы'})
    
    @action(detail=True, methods=['post'])
    def fix_accruals(self, request, pk=None):
        """Исправить суммы в существующих начислениях из ставки договора"""
        contract = self.get_object()
        AccrualService.fix_accruals_for_contract(contract)
        return Response({'status': 'Начисления исправлены'})
    
    @action(detail=True, methods=['get'])
    def accruals(self, request, pk=None):
        """Получить начисления по договору"""
        contract = self.get_object()
        accruals = Accrual.objects.filter(contract=contract).order_by('period_start')
        from accruals.serializers import AccrualListSerializer
        serializer = AccrualListSerializer(accruals, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def generate_all_accruals(self, request):
        """Сгенерировать начисления для всех активных договоров без начислений"""
        active_contracts = Contract.objects.filter(status='active')
        generated = 0
        
        for contract in active_contracts:
            accruals_count = Accrual.objects.filter(contract=contract).count()
            if accruals_count == 0:
                AccrualService.generate_accruals_for_contract(contract)
                generated += 1
        
        return Response({
            'status': f'Начисления сгенерированы для {generated} договоров',
            'generated': generated
        })
    
    @action(detail=False, methods=['post'])
    def fix_all_accruals(self, request):
        """Исправить все planned начисления для всех договоров, используя точные значения из договоров"""
        contracts = Contract.objects.all()
        fixed = 0
        
        for contract in contracts:
            planned_count = Accrual.objects.filter(contract=contract, status='planned').count()
            if planned_count > 0:
                AccrualService.fix_accruals_for_contract(contract)
                fixed += planned_count
        
        return Response({
            'status': f'Исправлено {fixed} начислений для всех договоров',
            'fixed': fixed
        })