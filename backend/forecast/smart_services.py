"""
Smart Forecast — rule-based прогноз с учётом платежной дисциплины.
Не заменяет текущий /api/forecast/. Добавляет слой «умного» прогноза.
FEATURE_SMART_FORECAST: включается когда feature включён.

Логика (без ML):
- payment_discipline = % вовремя оплаченных начислений по арендатору
- avg_delay_days = среднее опоздание по оплате (дней)
- risk_score = f(discipline, delay, overdue_count)
- expected_on_time / expected_delayed — оценка поступления по срокам
"""
from decimal import Decimal
from datetime import timedelta
from django.db.models import Sum, Avg
from django.utils import timezone


def get_tenant_payment_stats(tenant_id):
    """Статистика платежей по арендатору: дисциплина, среднее опоздание."""
    from accruals.models import Accrual
    from payments.models import Payment

    accruals = Accrual.objects.filter(contract__tenant_id=tenant_id)
    total_accrued = accruals.count()
    if total_accrued == 0:
        return {'on_time_percent': 100, 'avg_delay_days': 0, 'overdue_count': 0}

    on_time = 0
    delays = []
    overdue_count = 0
    today = timezone.now().date()

    for acc in accruals.select_related('contract'):
        paid_amount = Payment.objects.filter(accrual=acc, is_returned=False).aggregate(s=Sum('amount'))['s'] or Decimal('0')
        if paid_amount < acc.final_amount:
            if acc.due_date < today:
                overdue_count += 1
            continue
        first_payment = Payment.objects.filter(accrual=acc, is_returned=False).order_by('payment_date').first()
        if first_payment:
            delay = (first_payment.payment_date - acc.due_date).days
            delays.append(max(0, delay))
            if delay <= 0:
                on_time += 1
        else:
            on_time += 1

    on_time_percent = (on_time / total_accrued * 100) if total_accrued else 100
    avg_delay = sum(delays) / len(delays) if delays else 0

    return {
        'on_time_percent': round(on_time_percent, 1),
        'avg_delay_days': round(avg_delay, 1),
        'overdue_count': overdue_count,
    }


def calculate_risk_score(stats):
    """risk_score 0-100: выше = рискованнее."""
    score = 0
    score += max(0, 100 - stats.get('on_time_percent', 100)) * 0.5
    score += min(30, stats.get('avg_delay_days', 0)) * 1.5
    score += stats.get('overdue_count', 0) * 10
    return min(100, round(score, 1))


def get_smart_forecast(from_date=None, to_date=None):
    """
    Прогноз по договорам с risk_score и expected_delayed.
    Возвращает список {contract_id, tenant_name, base_expected, smart_expected, risk_score, ...}
    """
    from accruals.models import Accrual
    from contracts.models import Contract

    today = timezone.now().date()
    if not from_date:
        from_date = today
    if not to_date:
        to_date = today + timedelta(days=90)

    accruals = Accrual.objects.filter(
        contract__status='active',
        due_date__gte=from_date,
        due_date__lte=to_date,
    ).select_related('contract', 'contract__tenant', 'contract__property')

    result = []
    seen_contracts = set()

    for acc in accruals:
        cid = acc.contract_id
        if cid in seen_contracts:
            continue
        seen_contracts.add(cid)

        stats = get_tenant_payment_stats(acc.contract.tenant_id)
        risk_score = calculate_risk_score(stats)

        base_expected = acc.contract.rent_amount
        if risk_score > 50:
            smart_expected = Decimal(base_expected) * Decimal('0.9')
        elif risk_score > 25:
            smart_expected = Decimal(base_expected) * Decimal('0.95')
        else:
            smart_expected = Decimal(base_expected)

        result.append({
            'contract_id': cid,
            'contract_number': acc.contract.number,
            'tenant_name': acc.contract.tenant.name,
            'property_name': acc.contract.property.name if acc.contract.property else '',
            'base_expected': str(base_expected),
            'smart_expected': str(smart_expected),
            'risk_score': risk_score,
            'confidence_score': 100 - risk_score,
            'payment_discipline': stats['on_time_percent'],
            'avg_delay_days': stats['avg_delay_days'],
            'overdue_count': stats['overdue_count'],
        })

    return result
