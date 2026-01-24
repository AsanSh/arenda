from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Q, Min, Max
from django.utils import timezone
from datetime import timedelta, datetime
from decimal import Decimal
from accruals.models import Accrual
from contracts.models import Contract
from payments.models import Payment
from core.mixins import DataScopingMixin


class ForecastViewSet(DataScopingMixin, viewsets.ViewSet):
    """
    ViewSet для прогноза поступлений с RBAC и data scoping.
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def calculate(self, request):
        """
        Расчет прогноза поступлений на будущее.
        Прогноз включает начисления, у которых срок оплаты (due_date) попадает в указанный период.
        Поддерживает параметры: days (количество дней от сегодня) или from/to (конкретные даты).
        """
        today = timezone.now().date()
        
        # Определяем период: либо через days, либо через from/to, либо all_time
        all_time = request.query_params.get('all_time', '').lower() == 'true'
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        
        if all_time:
            # Для "Все время" не применяем фильтрацию по датам
            from_date = None
            to_date = None
        elif from_date and to_date:
            try:
                from_date = datetime.strptime(from_date, '%Y-%m-%d').date()
                to_date = datetime.strptime(to_date, '%Y-%m-%d').date()
            except ValueError:
                from_date = today
                to_date = today + timedelta(days=30)
        else:
            days_ahead = int(request.query_params.get('days', 30))
            from_date = today
            to_date = today + timedelta(days=days_ahead)
        
        # Получаем все начисления по активным договорам
        # Включаем все начисления (даже полностью оплаченные), чтобы видеть полную картину
        accruals_query = Accrual.objects.filter(contract__status='active')
        if from_date and to_date:
            # Фильтруем по периоду только если указаны даты
            accruals_query = accruals_query.filter(
                due_date__lte=to_date,
                due_date__gte=from_date
            )
        # Применяем data scoping
        accruals_query = self._scope_for_user(accruals_query, request.user, 'Accrual')
        accruals = accruals_query.select_related('contract', 'contract__property', 'contract__tenant', 'contract__landlord')
        
        # Получаем уже созданные платежи (поступления)
        # Это фактические поступления, которые уже были получены
        payments_query = Payment.objects.filter(contract__status='active')
        if from_date and to_date:
            # Фильтруем по периоду только если указаны даты
            payments_query = payments_query.filter(
                payment_date__lte=to_date,
                payment_date__gte=from_date
            )
        # Применяем data scoping
        payments_query = self._scope_for_user(payments_query, request.user, 'Payment')
        payments = payments_query.select_related('contract', 'contract__landlord')
        
        # Группировка по месяцам (по месяцу due_date для начислений, по payment_date для платежей)
        # Инициализируем все месяцы в периоде прогноза (если период указан)
        monthly_forecast = {}
        if from_date and to_date:
            current_date = from_date.replace(day=1)  # Начинаем с первого дня месяца
            while current_date <= to_date:
                month_key = current_date.strftime('%Y-%m')
                if month_key not in monthly_forecast:
                    monthly_forecast[month_key] = {
                        'accrued': Decimal('0'),  # Начислено
                        'received': Decimal('0'),  # Поступления
                        'balance': Decimal('0'),  # Остаток
                        'overdue': Decimal('0')  # Просрочено
                    }
                # Переходим к следующему месяцу
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1, day=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1, day=1)
        
        total_accrued = Decimal('0')  # Начислено (сумма всех начислений)
        total_received = Decimal('0')  # Поступления (фактические платежи)
        total_balance = Decimal('0')  # Остаток к оплате
        total_overdue = Decimal('0')  # Просрочено в периоде
        
        # Обрабатываем начисления
        for accrual in accruals:
            # Группируем по месяцу due_date (срок оплаты)
            month_key = accrual.due_date.strftime('%Y-%m')
            if month_key not in monthly_forecast:
                monthly_forecast[month_key] = {
                    'accrued': Decimal('0'),
                    'received': Decimal('0'),
                    'balance': Decimal('0'),
                    'overdue': Decimal('0')
                }
            
            # Начислено - сумма всех начислений (final_amount)
            monthly_forecast[month_key]['accrued'] += accrual.final_amount
            # Остаток - остаток к оплате
            monthly_forecast[month_key]['balance'] += accrual.balance
            
            total_accrued += accrual.final_amount
            total_balance += accrual.balance
            
            # Просрочено - начисления, у которых due_date < today и balance > 0, и они в выбранном периоде
            if accrual.due_date < today and accrual.balance > 0:
                monthly_forecast[month_key]['overdue'] += accrual.balance
                total_overdue += accrual.balance
        
        # Обрабатываем платежи (фактические поступления)
        for payment in payments:
            month_key = payment.payment_date.strftime('%Y-%m')
            if month_key not in monthly_forecast:
                monthly_forecast[month_key] = {
                    'accrued': Decimal('0'),
                    'received': Decimal('0'),
                    'balance': Decimal('0'),
                    'overdue': Decimal('0')
                }
            
            # Поступления - фактические платежи
            monthly_forecast[month_key]['received'] += payment.amount
            total_received += payment.amount
        
        # Проверяем синхронизацию: сумма monthly должна равняться summary
        monthly_accrued_sum = sum(Decimal(data['accrued']) for data in monthly_forecast.values())
        monthly_received_sum = sum(Decimal(data['received']) for data in monthly_forecast.values())
        monthly_balance_sum = sum(Decimal(data['balance']) for data in monthly_forecast.values())
        monthly_overdue_sum = sum(Decimal(data['overdue']) for data in monthly_forecast.values())
        
        # Используем данные из monthly как источник истины
        total_accrued = monthly_accrued_sum
        total_received = monthly_received_sum
        total_balance = monthly_balance_sum
        total_overdue = monthly_overdue_sum
        
        # Преобразуем monthly_forecast в формат для API
        monthly_result = {}
        for month, data in monthly_forecast.items():
            monthly_result[month] = {
                'accrued': str(data['accrued']),  # Начислено
                'received': str(data['received']),  # Поступления
                'balance': str(data['balance']),  # Остаток
                'overdue': str(data['overdue'])  # Просрочено
            }
        
        # Вычисляем количество дней в периоде
        if from_date and to_date:
            days_in_period = (to_date - from_date).days + 1
            period_data = {
                'from': from_date.isoformat(),
                'to': to_date.isoformat(),
                'days': days_in_period
            }
        else:
            # Для "Все время" определяем период на основе данных
            if accruals.exists():
                min_date = accruals.aggregate(Min('due_date'))['due_date__min']
                max_date = accruals.aggregate(Max('due_date'))['due_date__max']
                if min_date and max_date:
                    days_in_period = (max_date - min_date).days + 1
                    period_data = {
                        'from': min_date.isoformat(),
                        'to': max_date.isoformat(),
                        'days': days_in_period
                    }
                else:
                    period_data = {
                        'from': None,
                        'to': None,
                        'days': 0
                    }
            else:
                period_data = {
                    'from': None,
                    'to': None,
                    'days': 0
                }
        
        return Response({
            'period': period_data,
            'summary': {
                'accrued': str(total_accrued),  # Начислено (сумма всех начислений в периоде)
                'received': str(total_received),  # Поступления (фактические платежи в периоде)
                'balance': str(total_balance),  # Остаток к оплате в периоде
                'overdue': str(total_overdue)  # Просрочено в периоде
            },
            'monthly': monthly_result
        })
    
    @action(detail=False, methods=['get'])
    def by_contract(self, request):
        """Прогноз по договорам с data scoping"""
        today = timezone.now().date()
        days_ahead = int(request.query_params.get('days', 30))
        end_date = today + timedelta(days=days_ahead)
        
        contracts_query = Contract.objects.filter(status='active')
        # Применяем data scoping
        contracts_query = self._scope_for_user(contracts_query, request.user, 'Contract')
        contracts = contracts_query.select_related('tenant', 'property', 'landlord')
        result = []
        
        for contract in contracts:
            accruals = Accrual.objects.filter(
                contract=contract,
                period_start__lte=end_date,
                balance__gt=0
            )
            
            expected = accruals.aggregate(total=Sum('final_amount'))['total'] or Decimal('0')
            paid = accruals.aggregate(total=Sum('paid_amount'))['total'] or Decimal('0')
            balance = expected - paid
            
            result.append({
                'contract_id': contract.id,
                'contract_number': contract.number,
                'tenant': contract.tenant.name,
                'property': contract.property.name,
                'expected': expected,
                'paid': paid,
                'balance': balance
            })
        
        return Response(result)
