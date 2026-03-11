"""
PropertyAnalyticsService — метрики по объектам недвижимости.
Использует существующие модели: Contract, Accrual, Payment, Deposit, Expense.
FEATURE_ANALYTICS: сервис доступен когда feature включён.
"""
from decimal import Decimal
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import timedelta


def get_property_analytics(property_id=None, from_date=None, to_date=None):
    """
    Агрегирует метрики по объекту(ам).
    Возвращает: total_accrued, total_paid, outstanding_debt, overdue_amount,
    deposit_held, expenses, net_cashflow, collection_rate, occupancy_rate.
    """
    from accruals.models import Accrual
    from contracts.models import Contract
    from payments.models import Payment
    from deposits.models import Deposit
    from account.models import Expense

    today = timezone.now().date()
    if not from_date:
        from_date = today.replace(day=1) - timedelta(days=365)
    if not to_date:
        to_date = today

    base_contract_filter = Q(status='active')
    if property_id:
        base_contract_filter &= Q(property_id=property_id)

    # Total Accrued (начислено)
    accruals = Accrual.objects.filter(contract__in=Contract.objects.filter(base_contract_filter))
    if from_date and to_date:
        accruals = accruals.filter(
            period_start__lte=to_date,
            period_end__gte=from_date,
        )
    total_accrued = accruals.aggregate(s=Sum('final_amount'))['s'] or Decimal('0')

    # Total Paid (оплачено)
    payments = Payment.objects.filter(
        contract__in=Contract.objects.filter(base_contract_filter),
        is_returned=False,
    )
    if from_date and to_date:
        payments = payments.filter(payment_date__gte=from_date, payment_date__lte=to_date)
    total_paid = payments.aggregate(s=Sum('amount'))['s'] or Decimal('0')

    # Outstanding Debt (задолженность)
    accruals_all = Accrual.objects.filter(contract__in=Contract.objects.filter(base_contract_filter))
    total_accrued_all = accruals_all.aggregate(s=Sum('final_amount'))['s'] or Decimal('0')
    total_paid_all = Payment.objects.filter(
        contract__in=Contract.objects.filter(base_contract_filter),
        is_returned=False,
    ).aggregate(s=Sum('amount'))['s'] or Decimal('0')
    outstanding_debt = total_accrued_all - total_paid_all
    if outstanding_debt < 0:
        outstanding_debt = Decimal('0')

    # Overdue Amount (просрочка)
    overdue_accruals = accruals_all.filter(due_date__lt=today)
    from payments.models import PaymentAllocation
    overdue_paid = PaymentAllocation.objects.filter(
        accrual__in=overdue_accruals,
        payment__is_returned=False,
    ).aggregate(s=Sum('amount'))['s'] or Decimal('0')
    overdue_accrued = overdue_accruals.aggregate(s=Sum('final_amount'))['s'] or Decimal('0')
    overdue_amount = overdue_accrued - overdue_paid
    if overdue_amount < 0:
        overdue_amount = Decimal('0')

    # Deposit Held (остаток депозитов)
    deposits = Deposit.objects.filter(contract__in=Contract.objects.filter(base_contract_filter))
    deposit_held = deposits.aggregate(s=Sum('balance'))['s'] or Decimal('0')

    # Expenses
    expenses_filter = Q()
    if property_id:
        expenses_filter = Q(property_id=property_id) | Q(contract__property_id=property_id)
    else:
        expenses_filter = Q(contract__in=Contract.objects.filter(base_contract_filter))
    expenses_qs = Expense.objects.filter(expenses_filter)
    if from_date and to_date:
        expenses_qs = expenses_qs.filter(date__gte=from_date, date__lte=to_date)
    expenses_total = expenses_qs.aggregate(s=Sum('amount'))['s'] or Decimal('0')

    net_cashflow = total_paid - expenses_total
    collection_rate = (total_paid / total_accrued * 100) if total_accrued else Decimal('100')

    result = {
        'total_accrued': str(total_accrued),
        'total_paid': str(total_paid),
        'outstanding_debt': str(outstanding_debt),
        'overdue_amount': str(overdue_amount),
        'deposit_held': str(deposit_held),
        'expenses': str(expenses_total),
        'net_cashflow': str(net_cashflow),
        'collection_rate': str(round(collection_rate, 1)),
    }

    if not property_id:
        from properties.models import Property
        props = Property.objects.filter(contracts__status='active').distinct()
        result['properties'] = []
        for prop in props[:50]:
            p_data = get_property_analytics(property_id=prop.id, from_date=from_date, to_date=to_date)
            result['properties'].append({
                'id': prop.id,
                'name': prop.name,
                **p_data,
            })

    return result
