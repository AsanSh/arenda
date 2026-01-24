from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta, datetime
from decimal import Decimal
from accruals.models import Accrual
from contracts.models import Contract
from payments.models import Payment
from accounts.models import Account
from properties.models import Property
from core.models import Tenant
from deposits.models import Deposit
from core.mixins import DataScopingMixin


class DashboardViewSet(DataScopingMixin, viewsets.ViewSet):
    """
    ViewSet для дашборда с общей статистикой и ключевыми метриками.
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Получить общую статистику для дашборда с data scoping.
        """
        today = timezone.now().date()
        user = request.user
        
        # Применяем data scoping для начислений
        accruals_queryset = Accrual.objects.filter(contract__status='active')
        accruals_queryset = self._scope_for_user(accruals_queryset, user, 'Accrual')
        
        # Общая статистика по начислениям
        total_accruals = accruals_queryset.aggregate(
            total=Sum('final_amount')
        )['total'] or Decimal('0')
        
        total_paid = accruals_queryset.aggregate(
            total=Sum('paid_amount')
        )['total'] or Decimal('0')
        
        total_balance = accruals_queryset.aggregate(
            total=Sum('balance')
        )['total'] or Decimal('0')
        
        # Просроченные начисления
        overdue_accruals = accruals_queryset.filter(
            due_date__lt=today,
            balance__gt=0
        )
        overdue_count = overdue_accruals.count()
        overdue_amount = overdue_accruals.aggregate(total=Sum('balance'))['total'] or Decimal('0')
        
        # Начисления к оплате в ближайшие 7 дней
        week_from_now = today + timedelta(days=7)
        due_soon = accruals_queryset.filter(
            due_date__gte=today,
            due_date__lte=week_from_now,
            balance__gt=0
        )
        due_soon_count = due_soon.count()
        due_soon_amount = due_soon.aggregate(total=Sum('balance'))['total'] or Decimal('0')
        
        # Поступления за текущий месяц (с data scoping)
        current_month_start = today.replace(day=1)
        payments_queryset = Payment.objects.filter(
            payment_date__gte=current_month_start,
            payment_date__lte=today,
            is_returned=False
        )
        payments_queryset = self._scope_for_user(payments_queryset, user, 'Payment')
        payments_month_count = payments_queryset.count()
        payments_month_amount = payments_queryset.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Поступления за последние 30 дней
        month_ago = today - timedelta(days=30)
        payments_last_month = Payment.objects.filter(
            payment_date__gte=month_ago,
            payment_date__lte=today,
            is_returned=False
        )
        payments_last_month = self._scope_for_user(payments_last_month, user, 'Payment')
        payments_last_month_amount = payments_last_month.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Общая статистика (только для admin/staff)
        if user.role in ['admin', 'staff']:
            total_properties = Property.objects.exclude(status='inactive').count()
            total_tenants = Tenant.objects.all().count()
            total_contracts = Contract.objects.filter(status='active').count()
            total_account_balance = Account.objects.filter(is_active=True).aggregate(
                total=Sum('balance')
            )['total'] or Decimal('0')
            deposits_total = Deposit.objects.aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0')
            deposits_balance = Deposit.objects.aggregate(
                total=Sum('balance')
            )['total'] or Decimal('0')
            deposits_count = Deposit.objects.count()
        else:
            # Для клиентов - только связанные данные
            properties_queryset = Property.objects.exclude(status='inactive')
            properties_queryset = self._scope_for_user(properties_queryset, user, 'Property')
            total_properties = properties_queryset.count()
            
            contracts_queryset = Contract.objects.filter(status='active')
            contracts_queryset = self._scope_for_user(contracts_queryset, user, 'Contract')
            total_contracts = contracts_queryset.count()
            
            # Для клиентов показываем только свой контрагент
            if user.counterparty:
                total_tenants = 1
            else:
                total_tenants = 0
            
            # Баланс по счетам - только для admin/staff
            total_account_balance = Decimal('0')
            
            # Депозиты - только связанные с договорами клиента
            if user.counterparty:
                deposits_queryset = Deposit.objects.filter(contract__in=contracts_queryset)
                deposits_total = deposits_queryset.aggregate(total=Sum('amount'))['total'] or Decimal('0')
                deposits_balance = deposits_queryset.aggregate(total=Sum('balance'))['total'] or Decimal('0')
                deposits_count = deposits_queryset.count()
            else:
                deposits_total = Decimal('0')
                deposits_balance = Decimal('0')
                deposits_count = 0
        
        return Response({
            'accruals': {
                'total': str(total_accruals),
                'paid': str(total_paid),
                'balance': str(total_balance),
                'overdue_count': overdue_count,
                'overdue_amount': str(overdue_amount),
                'due_soon_count': due_soon_count,
                'due_soon_amount': str(due_soon_amount),
            },
            'payments': {
                'this_month_count': payments_month_count,
                'this_month_amount': str(payments_month_amount),
                'last_30_days_amount': str(payments_last_month_amount),
            },
            'general': {
                'properties': total_properties,
                'tenants': total_tenants,
                'contracts': total_contracts,
                'account_balance': str(total_account_balance),
            },
            'deposits': {
                'total': str(deposits_total),
                'balance': str(deposits_balance),
                'count': deposits_count,
            }
        })
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """
        Получить просроченные начисления для дашборда с data scoping.
        """
        today = timezone.now().date()
        limit = int(request.query_params.get('limit', 10))
        user = request.user
        
        overdue = Accrual.objects.filter(
            contract__status='active',
            due_date__lt=today,
            balance__gt=0
        )
        overdue = self._scope_for_user(overdue, user, 'Accrual')
        overdue = overdue.select_related(
            'contract', 'contract__property', 'contract__tenant'
        ).order_by('due_date')[:limit]
        
        from accruals.serializers import AccrualListSerializer
        serializer = AccrualListSerializer(overdue, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def recent_payments(self, request):
        """
        Получить последние платежи для дашборда с data scoping.
        """
        limit = int(request.query_params.get('limit', 10))
        user = request.user
        
        recent = Payment.objects.filter(
            is_returned=False
        )
        recent = self._scope_for_user(recent, user, 'Payment')
        recent = recent.select_related(
            'contract', 'contract__property', 'contract__tenant', 'account'
        ).order_by('-payment_date', '-created_at')[:limit]
        
        from payments.serializers import PaymentListSerializer
        serializer = PaymentListSerializer(recent, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def upcoming_payments(self, request):
        """
        Получить предстоящие платежи (начисления к оплате в ближайшие дни) с data scoping.
        """
        today = timezone.now().date()
        days_ahead = int(request.query_params.get('days', 30))
        end_date = today + timedelta(days=days_ahead)
        limit = int(request.query_params.get('limit', 10))
        user = request.user
        
        upcoming = Accrual.objects.filter(
            contract__status='active',
            due_date__gte=today,
            due_date__lte=end_date,
            balance__gt=0
        )
        upcoming = self._scope_for_user(upcoming, user, 'Accrual')
        upcoming = upcoming.select_related(
            'contract', 'contract__property', 'contract__tenant'
        ).order_by('due_date')[:limit]
        
        from accruals.serializers import AccrualListSerializer
        serializer = AccrualListSerializer(upcoming, many=True)
        return Response(serializer.data)
