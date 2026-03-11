from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from django.db.models import Q

from .models import Accrual
from contracts.models import Contract


class AccrualService:
    """Сервис для генерации и управления начислениями"""
    
    @staticmethod
    def generate_accruals_for_contract(contract: Contract):
        """
        Генерация начислений по договору от start_date до end_date
        Берет ТОЧНОЕ значение ставки аренды из договора без изменений
        """
        if contract.status not in ['active', 'draft']:
            return
        
        current_date = contract.start_date
        end_date = contract.end_date
        
        # Удаляем только незапланированные начисления (planned), если пересоздаем
        # Но не трогаем уже оплаченные или частично оплаченные
        Accrual.objects.filter(contract=contract, status='planned').delete()
        
        # Проверяем, есть ли уже начисления для этого договора
        existing_accruals = Accrual.objects.filter(contract=contract).exclude(status='planned')
        if existing_accruals.exists():
            # Если есть существующие начисления, начинаем с даты после последнего начисления
            last_accrual = existing_accruals.order_by('-period_end').first()
            if last_accrual and last_accrual.period_end >= current_date:
                current_date = last_accrual.period_end + timedelta(days=1)
        
        # Обновляем объект из базы для получения актуального значения rent_amount и льготных периодов
        contract.refresh_from_db()
        rent_amount = contract.rent_amount
        discount_periods = list(contract.discount_periods.all())

        def get_discount_for_period(period_start, period_end):
            """Проверяет пересечение периода начисления с льготными периодами. Возвращает скидку (%) или 0."""
            for dp in discount_periods:
                if period_start <= dp.end_date and period_end >= dp.start_date:
                    return float(dp.discount_percent or 0)
            return 0

        while current_date < end_date:
            # Определяем период начисления (обычно месяц)
            period_end = min(
                current_date + relativedelta(months=1) - timedelta(days=1),
                end_date
            )
            
            # Due date = день оплаты в месяце окончания периода
            due_date = date(
                period_end.year,
                period_end.month,
                min(contract.due_day, 28)  # Защита от 31-го числа
            )
            
            # Применяем скидку, если период попадает в льготный
            discount = get_discount_for_period(current_date, period_end)
            discounted_rent = rent_amount * (Decimal('1') - Decimal(str(discount)) / Decimal('100'))
            discount_adjustment = discounted_rent - rent_amount  # для recalculate: final = base + adj + util

            accrual = Accrual.objects.create(
                contract=contract,
                period_start=current_date,
                period_end=period_end,
                due_date=due_date,
                base_amount=rent_amount,
                adjustments=discount_adjustment,
                final_amount=discounted_rent,
                balance=discounted_rent,
                status='planned'
            )

            accrual.recalculate()  # сохранит скидку через adjustments
            
            # Переходим к следующему периоду
            current_date = period_end + timedelta(days=1)
    
    @staticmethod
    def recalculate_accrual(accrual: Accrual):
        """Пересчет начисления"""
        accrual.recalculate()
    
    @staticmethod
    def fix_accruals_for_contract(contract: Contract):
        """
        Исправляет суммы в существующих начислениях из ставки договора и льготных периодов.
        Обновляет: неоплаченные (planned, due, overdue, partial) и «оплаченные скидкой»
        (status=paid, paid_amount=0) — иначе при удалении/изменении льготы они останутся с 0.
        Начисления с реальными платежами (paid_amount>0) не трогаем.
        """
        accruals_to_fix = Accrual.objects.filter(contract=contract).filter(
            Q(status__in=['planned', 'due', 'overdue', 'partial']) |
            Q(status='paid', paid_amount=0)
        )
        
        # Обновляем объект из базы для получения актуального значения rent_amount и льготных периодов
        contract.refresh_from_db()
        rent_amount = contract.rent_amount
        discount_periods = list(contract.discount_periods.all())

        def get_discount_for_period(period_start, period_end):
            for dp in discount_periods:
                if period_start <= dp.end_date and period_end >= dp.start_date:
                    return float(dp.discount_percent or 0)
            return 0

        for accrual in accruals_to_fix:
            discount = get_discount_for_period(accrual.period_start, accrual.period_end)
            discounted_rent = rent_amount * (Decimal('1') - Decimal(str(discount)) / Decimal('100'))
            accrual.base_amount = rent_amount
            # Скидка в adjustments, чтобы recalculate() считал final_amount = base + adjustments + utilities
            accrual.adjustments = discounted_rent - rent_amount
            # recalculate() сам вычислит final_amount и balance по формуле
            accrual.recalculate()
    
    @staticmethod
    def update_all_accrual_statuses():
        """
        Обновляет статусы всех начислений на основе текущей даты
        Полезно для периодического обновления (например, через cron)
        """
        from django.utils import timezone
        today = timezone.now().date()
        
        # Обновляем только начисления, которые могут изменить статус
        # (не оплаченные и не частично оплаченные)
        accruals_to_update = Accrual.objects.filter(
            status__in=['planned', 'due', 'overdue'],
            balance__gt=0
        )
        
        for accrual in accruals_to_update:
            accrual.recalculate()