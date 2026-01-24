from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Q, Count
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from accruals.models import Accrual
from contracts.models import Contract
from payments.models import Payment
from account.models import Expense
from accounts.models import Account, AccountTransaction
from properties.models import Property
from core.models import Tenant
from core.mixins import DataScopingMixin


class ReportsViewSet(DataScopingMixin, viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    """
    ViewSet для генерации отчетов.
    """
    
    @action(detail=False, methods=['get'])
    def profit_and_loss(self, request):
        """
        Отчет о прибылях и убытках (P&L).
        
        Параметры:
        - from_date: начальная дата (YYYY-MM-DD)
        - to_date: конечная дата (YYYY-MM-DD)
        - all_time: true/false - для периода "Все время"
        - property_id: ID недвижимости (опционально)
        - tenant_id: ID контрагента (опционально)
        """
        # Получаем параметры фильтрации
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        all_time = request.query_params.get('all_time', '').lower() == 'true'
        property_id = request.query_params.get('property_id')
        tenant_id = request.query_params.get('tenant_id')
        
        # Парсим даты
        if all_time:
            from_date = None
            to_date = None
        elif from_date and to_date:
            try:
                from_date = datetime.strptime(from_date, '%Y-%m-%d').date()
                to_date = datetime.strptime(to_date, '%Y-%m-%d').date()
            except ValueError:
                from_date = None
                to_date = None
        
        # Если даты не указаны и не all_time, используем текущий месяц
        if not all_time and (not from_date or not to_date):
            today = timezone.now().date()
            from_date = today.replace(day=1)
            if today.month == 12:
                to_date = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                to_date = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        
        # Базовые фильтры
        accruals_filter = Q(contract__status='active')
        payments_filter = Q(contract__status='active', is_returned=False)
        expenses_filter = Q()
        
        if property_id:
            accruals_filter &= Q(contract__property_id=property_id)
            payments_filter &= Q(contract__property_id=property_id)
            expenses_filter &= Q(property_id=property_id)
        
        if tenant_id:
            accruals_filter &= Q(contract__tenant_id=tenant_id)
            payments_filter &= Q(contract__tenant_id=tenant_id)
            expenses_filter &= Q(contract__tenant_id=tenant_id)
        
        # Доходы: начисления за период (с data scoping)
        accruals_query = Accrual.objects.filter(accruals_filter)
        accruals_query = self._scope_for_user(accruals_query, request.user, 'Accrual')
        if not all_time and from_date and to_date:
            accruals_query = accruals_query.filter(
                period_start__lte=to_date,
                period_end__gte=from_date
            )
        accruals = accruals_query.select_related('contract', 'contract__property', 'contract__tenant')
        
        # Фактические поступления за период (с data scoping)
        payments_query = Payment.objects.filter(payments_filter)
        payments_query = self._scope_for_user(payments_query, request.user, 'Payment')
        if not all_time and from_date and to_date:
            payments_query = payments_query.filter(
                payment_date__gte=from_date,
                payment_date__lte=to_date
            )
        payments = payments_query.select_related('contract', 'contract__property', 'contract__tenant', 'account')
        
        # Расходы за период (транзакции типа expense)
        expenses_query = AccountTransaction.objects.filter(
            expenses_filter,
            transaction_type='expense'
        )
        if not all_time and from_date and to_date:
            expenses_query = expenses_query.filter(
                transaction_date__gte=from_date,
                transaction_date__lte=to_date
            )
        expenses = expenses_query.select_related('account', 'related_expense')
        
        # Подсчитываем итоги
        total_revenue = accruals.aggregate(total=Sum('final_amount'))['total'] or Decimal('0')
        total_received = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        profit = total_received - total_expenses
        
        # Детализация доходов (начисления)
        revenue_details = []
        for accrual in accruals:
            revenue_details.append({
                'id': accrual.id,
                'property_name': accrual.contract.property.name if accrual.contract.property else '',
                'property_address': accrual.contract.property.address if accrual.contract.property else '',
                'tenant_name': accrual.contract.tenant.name if accrual.contract.tenant else '',
                'contract_number': accrual.contract.number,
                'period_start': accrual.period_start.isoformat(),
                'period_end': accrual.period_end.isoformat(),
                'amount': str(accrual.final_amount),
                'currency': accrual.contract.currency
            })
        
        # Детализация поступлений (платежи)
        received_details = []
        for payment in payments:
            received_details.append({
                'id': payment.id,
                'property_name': payment.contract.property.name if payment.contract.property else '',
                'property_address': payment.contract.property.address if payment.contract.property else '',
                'tenant_name': payment.contract.tenant.name if payment.contract.tenant else '',
                'contract_number': payment.contract.number,
                'payment_date': payment.payment_date.isoformat(),
                'amount': str(payment.amount),
                'currency': payment.contract.currency,
                'account_name': payment.account.name if payment.account else ''
            })
        
        # Детализация расходов
        expenses_details = []
        for expense in expenses:
            expense_obj = expense.related_expense
            expenses_details.append({
                'id': expense.id,
                'transaction_date': expense.transaction_date.isoformat(),
                'amount': str(expense.amount),
                'account_name': expense.account.name if expense.account else '',
                'category': expense_obj.get_category_display() if expense_obj and hasattr(expense_obj, 'get_category_display') else '',
                'recipient': expense_obj.recipient if expense_obj and hasattr(expense_obj, 'recipient') else '',
                'comment': expense.comment or (expense_obj.comment if expense_obj and hasattr(expense_obj, 'comment') else ''),
                'currency': expense.account.currency if expense.account else 'KGS'
            })
        
        return Response({
            'period': {
                'from': from_date.isoformat() if from_date else None,
                'to': to_date.isoformat() if to_date else None,
                'all_time': all_time
            },
            'filters': {
                'property_id': property_id,
                'tenant_id': tenant_id
            },
            'summary': {
                'revenue': str(total_revenue),
                'received': str(total_received),
                'expenses': str(total_expenses),
                'profit_loss': str(profit)
            },
            'details': {
                'revenue': revenue_details,
                'received': received_details,
                'expenses': expenses_details
            }
        })
    
    def _group_by_month(self, accruals, payments, expenses, from_date, to_date):
        """Группировка по месяцам"""
        monthly_data = {}
        current_date = from_date.replace(day=1)
        
        # Инициализируем все месяцы в периоде
        while current_date <= to_date:
            month_key = current_date.strftime('%Y-%m')
            monthly_data[month_key] = {
                'revenue': Decimal('0'),
                'received': Decimal('0'),
                'expenses': Decimal('0'),
                'profit': Decimal('0')
            }
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1, day=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1, day=1)
        
        # Группируем начисления по месяцу периода
        for accrual in accruals:
            month_key = accrual.period_start.strftime('%Y-%m')
            if month_key in monthly_data:
                monthly_data[month_key]['revenue'] += accrual.final_amount
        
        # Группируем платежи по месяцу
        for payment in payments:
            month_key = payment.payment_date.strftime('%Y-%m')
            if month_key in monthly_data:
                monthly_data[month_key]['received'] += payment.amount
        
        # Группируем расходы по месяцу
        for expense in expenses:
            month_key = expense.date.strftime('%Y-%m')
            if month_key in monthly_data:
                monthly_data[month_key]['expenses'] += expense.amount
        
        # Вычисляем прибыль
        result = []
        for month, data in sorted(monthly_data.items()):
            data['profit'] = data['received'] - data['expenses']
            result.append({
                'month': month,
                'revenue': str(data['revenue']),
                'received': str(data['received']),
                'expenses': str(data['expenses']),
                'profit': str(data['profit'])
            })
        
        return result
    
    def _group_by_property(self, accruals, payments, expenses):
        """Группировка по недвижимости"""
        properties_data = {}
        
        # Начисления по недвижимости
        for accrual in accruals.select_related('contract__property'):
            prop = accrual.contract.property
            if prop.id not in properties_data:
                properties_data[prop.id] = {
                    'property_id': prop.id,
                    'property_name': prop.name,
                    'property_address': prop.address,
                    'revenue': Decimal('0'),
                    'received': Decimal('0'),
                    'expenses': Decimal('0'),
                    'profit': Decimal('0')
                }
            properties_data[prop.id]['revenue'] += accrual.final_amount
        
        # Платежи по недвижимости
        for payment in payments.select_related('contract__property'):
            prop = payment.contract.property
            if prop.id in properties_data:
                properties_data[prop.id]['received'] += payment.amount
        
        # Расходы по недвижимости
        for expense in expenses.select_related('property'):
            if expense.property and expense.property.id in properties_data:
                properties_data[expense.property.id]['expenses'] += expense.amount
        
        # Вычисляем прибыль
        result = []
        for prop_id, data in properties_data.items():
            data['profit'] = data['received'] - data['expenses']
            result.append({
                'property_id': data['property_id'],
                'property_name': data['property_name'],
                'property_address': data['property_address'],
                'revenue': str(data['revenue']),
                'received': str(data['received']),
                'expenses': str(data['expenses']),
                'profit': str(data['profit'])
            })
        
        return result
    
    def _group_by_tenant(self, accruals, payments, expenses):
        """Группировка по контрагентам"""
        tenants_data = {}
        
        # Начисления по контрагентам
        for accrual in accruals.select_related('contract__tenant'):
            tenant = accrual.contract.tenant
            if tenant.id not in tenants_data:
                tenants_data[tenant.id] = {
                    'tenant_id': tenant.id,
                    'tenant_name': tenant.name,
                    'revenue': Decimal('0'),
                    'received': Decimal('0'),
                    'expenses': Decimal('0'),
                    'profit': Decimal('0')
                }
            tenants_data[tenant.id]['revenue'] += accrual.final_amount
        
        # Платежи по контрагентам
        for payment in payments.select_related('contract__tenant'):
            tenant = payment.contract.tenant
            if tenant.id in tenants_data:
                tenants_data[tenant.id]['received'] += payment.amount
        
        # Расходы по контрагентам (если есть связь через договор)
        for expense in expenses.select_related('contract__tenant'):
            if expense.contract and expense.contract.tenant.id in tenants_data:
                tenants_data[expense.contract.tenant.id]['expenses'] += expense.amount
        
        # Вычисляем прибыль
        result = []
        for tenant_id, data in tenants_data.items():
            data['profit'] = data['received'] - data['expenses']
            result.append({
                'tenant_id': data['tenant_id'],
                'tenant_name': data['tenant_name'],
                'revenue': str(data['revenue']),
                'received': str(data['received']),
                'expenses': str(data['expenses']),
                'profit': str(data['profit'])
            })
        
        return result
    
    @action(detail=False, methods=['get'])
    def cash_flow(self, request):
        """
        Отчет о движении денежных средств.
        
        Параметры:
        - from_date: начальная дата (YYYY-MM-DD)
        - to_date: конечная дата (YYYY-MM-DD)
        - property_id: ID недвижимости (опционально)
        - tenant_id: ID контрагента (опционально)
        - account_id: ID счета (опционально)
        - group_by: группировка ('month' или 'account')
        """
        # Получаем параметры фильтрации
        from_date = request.query_params.get('from_date') or request.query_params.get('from')
        to_date = request.query_params.get('to_date') or request.query_params.get('to')
        all_time = request.query_params.get('all_time', '').lower() == 'true'
        property_id = request.query_params.get('property_id')
        tenant_id = request.query_params.get('tenant_id')
        account_id = request.query_params.get('account_id')
        group_by = request.query_params.get('group_by', 'month')
        
        # Парсим даты
        if all_time:
            from_date = None
            to_date = None
        elif from_date:
            try:
                from_date = datetime.strptime(from_date, '%Y-%m-%d').date()
            except ValueError:
                from_date = None
        if not all_time and to_date:
            try:
                to_date = datetime.strptime(to_date, '%Y-%m-%d').date()
            except ValueError:
                to_date = None
        
        # Если даты не указаны, используем текущий месяц
        if not all_time and (not from_date or not to_date):
            today = timezone.now().date()
            from_date = today.replace(day=1)
            if today.month == 12:
                to_date = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                to_date = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        
        # Фильтры для транзакций по счетам
        transactions_filter = Q()
        if not all_time and from_date and to_date:
            transactions_filter &= Q(
                transaction_date__gte=from_date,
                transaction_date__lte=to_date
            )
        
        if account_id:
            transactions_filter &= Q(account_id=account_id)
        
        # Получаем транзакции
        transactions = AccountTransaction.objects.filter(transactions_filter).select_related('account')
        
        # Фильтры для платежей (для дополнительной информации)
        payments_filter = Q(is_returned=False)
        if not all_time and from_date and to_date:
            payments_filter &= Q(
                payment_date__gte=from_date,
                payment_date__lte=to_date
            )
        
        if property_id:
            payments_filter &= Q(contract__property_id=property_id)
        if tenant_id:
            payments_filter &= Q(contract__tenant_id=tenant_id)
        if account_id:
            payments_filter &= Q(account_id=account_id)
        
        payments = Payment.objects.filter(payments_filter)
        
        # Фильтры для расходов
        expenses_filter = Q()
        if not all_time and from_date and to_date:
            expenses_filter &= Q(
                date__gte=from_date,
                date__lte=to_date
            )
        
        if property_id:
            expenses_filter &= Q(property_id=property_id)
        if tenant_id:
            expenses_filter &= Q(contract__tenant_id=tenant_id)
        
        expenses = Expense.objects.filter(expenses_filter)

        # Общая сводка
        total_income = transactions.filter(transaction_type='income').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        total_expenses = transactions.filter(transaction_type='expense').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        total_transfers_in = transactions.filter(transaction_type='transfer_in').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        total_transfers_out = transactions.filter(transaction_type='transfer_out').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        net_cash_flow = total_income + total_transfers_in - total_expenses - total_transfers_out

        monthly_result = []
        accounts_result = []
        if group_by == 'month':
            monthly_result = self._group_cash_flow_by_month(transactions, payments, expenses, from_date, to_date, all_time)
        elif group_by == 'account':
            accounts_result = self._group_cash_flow_by_account(transactions, payments, expenses)

        return Response({
            'period': {
                'from': from_date.isoformat() if from_date else None,
                'to': to_date.isoformat() if to_date else None,
                'all_time': all_time
            },
            'filters': {
                'property_id': property_id,
                'tenant_id': tenant_id,
                'account_id': account_id
            },
            'summary': {
                'income': str(total_income),
                'expenses': str(total_expenses),
                'transfers_in': str(total_transfers_in),
                'transfers_out': str(total_transfers_out),
                'net_cash_flow': str(net_cash_flow)
            },
            'monthly': monthly_result,
            'accounts': accounts_result
        })
    
    def _group_cash_flow_by_month(self, transactions, payments, expenses, from_date, to_date, all_time=False):
        """Группировка движения денежных средств по месяцам"""
        monthly_data = {}

        # Для all_time определяем границы по данным транзакций, если не заданы
        if all_time and (not from_date or not to_date):
            if transactions.exists():
                from_date = transactions.order_by('transaction_date').first().transaction_date
                to_date = transactions.order_by('-transaction_date').first().transaction_date
            else:
                return []

        current_date = from_date.replace(day=1)
        
        # Инициализируем все месяцы
        while current_date <= to_date:
            month_key = current_date.strftime('%Y-%m')
            monthly_data[month_key] = {
                'income': Decimal('0'),
                'expenses': Decimal('0'),
                'transfers_in': Decimal('0'),
                'transfers_out': Decimal('0'),
                'net_cash_flow': Decimal('0')
            }
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1, day=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1, day=1)
        
        # Группируем транзакции
        for transaction in transactions:
            month_key = transaction.transaction_date.strftime('%Y-%m')
            if month_key in monthly_data:
                if transaction.transaction_type == 'income':
                    monthly_data[month_key]['income'] += transaction.amount
                elif transaction.transaction_type == 'expense':
                    monthly_data[month_key]['expenses'] += transaction.amount
                elif transaction.transaction_type == 'transfer_in':
                    monthly_data[month_key]['transfers_in'] += transaction.amount
                elif transaction.transaction_type == 'transfer_out':
                    monthly_data[month_key]['transfers_out'] += transaction.amount
        
        # Вычисляем чистый денежный поток
        result = []
        for month, data in sorted(monthly_data.items()):
            data['net_cash_flow'] = data['income'] + data.get('transfers_in', Decimal('0')) - data['expenses'] - data.get('transfers_out', Decimal('0'))
            result.append({
                'month': month,
                'income': str(data['income']),
                'expenses': str(data['expenses']),
                'transfers_in': str(data.get('transfers_in', Decimal('0'))),
                'transfers_out': str(data.get('transfers_out', Decimal('0'))),
                'net_cash_flow': str(data['net_cash_flow'])
            })
        
        return result
    
    def _group_cash_flow_by_account(self, transactions, payments, expenses):
        """Группировка движения денежных средств по счетам"""
        accounts_data = {}
        
        # Группируем транзакции по счетам
        for transaction in transactions.select_related('account'):
            account = transaction.account
            if account.id not in accounts_data:
                accounts_data[account.id] = {
                    'account_id': account.id,
                    'account_name': account.name,
                    'currency': account.currency,
                    'income': Decimal('0'),
                    'expenses': Decimal('0'),
                    'net_cash_flow': Decimal('0')
                }
            
            if transaction.transaction_type == 'income':
                accounts_data[account.id]['income'] += transaction.amount
            elif transaction.transaction_type == 'expense':
                accounts_data[account.id]['expenses'] += transaction.amount
        
        # Вычисляем чистый денежный поток
        result = []
        for account_id, data in accounts_data.items():
            data['net_cash_flow'] = data['income'] - data['expenses']
            result.append({
                'account_id': data['account_id'],
                'account_name': data['account_name'],
                'currency': data['currency'],
                'income': str(data['income']),
                'expenses': str(data['expenses']),
                'net_cash_flow': str(data['net_cash_flow'])
            })
        
        return result
    
    @action(detail=False, methods=['get'])
    def overdue_payments(self, request):
        """
        Отчет о просроченных платежах.
        
        Параметры:
        - property_id: ID недвижимости (опционально)
        - tenant_id: ID контрагента (опционально)
        - as_of_date: дата на которую считать просрочку (YYYY-MM-DD, по умолчанию сегодня)
        """
        property_id = request.query_params.get('property_id')
        tenant_id = request.query_params.get('tenant_id')
        as_of_date = request.query_params.get('as_of_date')
        
        # Парсим дату
        if as_of_date:
            try:
                as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d').date()
            except ValueError:
                as_of_date = timezone.now().date()
        else:
            as_of_date = timezone.now().date()
        
        # Фильтры для просроченных начислений
        overdue_filter = Q(
            contract__status='active',
            due_date__lt=as_of_date,
            balance__gt=0
        )
        
        if property_id:
            overdue_filter &= Q(contract__property_id=property_id)
        if tenant_id:
            overdue_filter &= Q(contract__tenant_id=tenant_id)
        
        overdue_accruals = Accrual.objects.filter(overdue_filter)
        # Применяем data scoping
        overdue_accruals = self._scope_for_user(overdue_accruals, request.user, 'Accrual')
        overdue_accruals = overdue_accruals.select_related(
            'contract', 'contract__property', 'contract__tenant'
        ).order_by('due_date')
        
        # Группируем по контрагентам
        tenants_data = {}
        total_overdue = Decimal('0')
        
        for accrual in overdue_accruals:
            tenant = accrual.contract.tenant
            if tenant.id not in tenants_data:
                tenants_data[tenant.id] = {
                    'tenant_id': tenant.id,
                    'tenant_name': tenant.name,
                    'accruals': [],
                    'total_overdue': Decimal('0'),
                    'oldest_overdue_days': 0
                }
            
            overdue_days = (as_of_date - accrual.due_date).days
            tenants_data[tenant.id]['accruals'].append({
                'id': accrual.id,
                'property_name': accrual.contract.property.name,
                'property_address': accrual.contract.property.address,
                'contract_number': accrual.contract.number,
                'due_date': accrual.due_date.isoformat(),
                'overdue_days': overdue_days,
                'amount': str(accrual.balance),
                'currency': accrual.contract.currency
            })
            tenants_data[tenant.id]['total_overdue'] += accrual.balance
            if overdue_days > tenants_data[tenant.id]['oldest_overdue_days']:
                tenants_data[tenant.id]['oldest_overdue_days'] = overdue_days
            
            total_overdue += accrual.balance
        
        # Формируем результат
        result = []
        for tenant_id, data in tenants_data.items():
            result.append({
                'tenant_id': data['tenant_id'],
                'tenant_name': data['tenant_name'],
                'total_overdue': str(data['total_overdue']),
                'oldest_overdue_days': data['oldest_overdue_days'],
                'accruals_count': len(data['accruals']),
                'accruals': data['accruals']
            })
        
        return Response({
            'as_of_date': as_of_date.isoformat(),
            'filters': {
                'property_id': property_id,
                'tenant_id': tenant_id
            },
            'summary': {
                'total_overdue': str(total_overdue),
                'tenants_count': len(result),
                'accruals_count': overdue_accruals.count()
            },
            'data': result
        })

# Backward compatibility: keep old name for imports if any
ReportViewSet = ReportsViewSet
