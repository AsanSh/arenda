from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
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


class DashboardViewSet(viewsets.ViewSet):
    """
    ViewSet для дашборда с общей статистикой и ключевыми метриками.
    """
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Получить общую статистику для дашборда.
        """
        today = timezone.now().date()
        
        # Общая статистика по начислениям
        total_accruals = Accrual.objects.filter(contract__status='active').aggregate(
            total=Sum('final_amount')
        )['total'] or Decimal('0')
        
        total_paid = Accrual.objects.filter(contract__status='active').aggregate(
            total=Sum('paid_amount')
        )['total'] or Decimal('0')
        
        total_balance = Accrual.objects.filter(contract__status='active').aggregate(
            total=Sum('balance')
        )['total'] or Decimal('0')
        
        # Просроченные начисления
        overdue_accruals = Accrual.objects.filter(
            contract__status='active',
            due_date__lt=today,
            balance__gt=0
        )
        overdue_count = overdue_accruals.count()
        overdue_amount = overdue_accruals.aggregate(total=Sum('balance'))['total'] or Decimal('0')
        
        # Начисления к оплате в ближайшие 7 дней
        week_from_now = today + timedelta(days=7)
        due_soon = Accrual.objects.filter(
            contract__status='active',
            due_date__gte=today,
            due_date__lte=week_from_now,
            balance__gt=0
        )
        due_soon_count = due_soon.count()
        due_soon_amount = due_soon.aggregate(total=Sum('balance'))['total'] or Decimal('0')
        
        # Поступления за текущий месяц
        current_month_start = today.replace(day=1)
        payments_this_month = Payment.objects.filter(
            payment_date__gte=current_month_start,
            payment_date__lte=today,
            is_returned=False
        )
        payments_month_count = payments_this_month.count()
        payments_month_amount = payments_this_month.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Поступления за последние 30 дней
        month_ago = today - timedelta(days=30)
        payments_last_month = Payment.objects.filter(
            payment_date__gte=month_ago,
            payment_date__lte=today,
            is_returned=False
        )
        payments_last_month_amount = payments_last_month.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Общая статистика
        # У Property нет поля is_active, используем status != 'inactive'
        total_properties = Property.objects.exclude(status='inactive').count()
        # У Tenant нет поля статуса, считаем все
        total_tenants = Tenant.objects.all().count()
        total_contracts = Contract.objects.filter(status='active').count()
        
        # Баланс по счетам
        total_account_balance = Account.objects.filter(is_active=True).aggregate(
            total=Sum('balance')
        )['total'] or Decimal('0')
        
        # Статистика по депозитам
        deposits_total = Deposit.objects.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        deposits_balance = Deposit.objects.aggregate(
            total=Sum('balance')
        )['total'] or Decimal('0')
        deposits_count = Deposit.objects.count()
        
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
        Получить просроченные начисления для дашборда.
        """
        today = timezone.now().date()
        limit = int(request.query_params.get('limit', 10))
        
        overdue = Accrual.objects.filter(
            contract__status='active',
            due_date__lt=today,
            balance__gt=0
        ).select_related(
            'contract', 'contract__property', 'contract__tenant'
        ).order_by('due_date')[:limit]
        
        from accruals.serializers import AccrualListSerializer
        serializer = AccrualListSerializer(overdue, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def recent_payments(self, request):
        """
        Получить последние платежи для дашборда.
        """
        limit = int(request.query_params.get('limit', 10))
        
        recent = Payment.objects.filter(
            is_returned=False
        ).select_related(
            'contract', 'contract__property', 'contract__tenant', 'account'
        ).order_by('-payment_date', '-created_at')[:limit]
        
        from payments.serializers import PaymentListSerializer
        serializer = PaymentListSerializer(recent, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def upcoming_payments(self, request):
        """
        Получить предстоящие платежи (начисления к оплате в ближайшие дни).
        """
        today = timezone.now().date()
        days_ahead = int(request.query_params.get('days', 30))
        end_date = today + timedelta(days=days_ahead)
        limit = int(request.query_params.get('limit', 10))
        
        upcoming = Accrual.objects.filter(
            contract__status='active',
            due_date__gte=today,
            due_date__lte=end_date,
            balance__gt=0
        ).select_related(
            'contract', 'contract__property', 'contract__tenant'
        ).order_by('due_date')[:limit]
        
        from accruals.serializers import AccrualListSerializer
        serializer = AccrualListSerializer(upcoming, many=True)
        return Response(serializer.data)
