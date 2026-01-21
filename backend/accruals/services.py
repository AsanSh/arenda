from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from decimal import Decimal
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
        
        # Обновляем объект из базы для получения актуального значения rent_amount
        contract.refresh_from_db()
        rent_amount = contract.rent_amount
        
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
            
            # Создаем начисление с ТОЧНЫМ значением из договора
            accrual = Accrual.objects.create(
                contract=contract,
                period_start=current_date,
                period_end=period_end,
                due_date=due_date,
                base_amount=rent_amount,
                final_amount=rent_amount,
                balance=rent_amount,
                status='planned'  # Временный статус, будет пересчитан ниже
            )
            
            # Пересчитываем статус на основе due_date (overdue, due, planned)
            accrual.recalculate()
            
            # Переходим к следующему периоду
            current_date = period_end + timedelta(days=1)
    
    @staticmethod
    def recalculate_accrual(accrual: Accrual):
        """Пересчет начисления"""
        accrual.recalculate()
    
    @staticmethod
    def fix_accruals_for_contract(contract: Contract):
        """
        Исправляет суммы в существующих начислениях, обновляя их из ставки договора
        Обновляет только planned начисления, чтобы не менять уже оплаченные
        Берет ТОЧНОЕ значение из договора без преобразований
        """
        # Обновляем только planned начисления
        planned_accruals = Accrual.objects.filter(contract=contract, status='planned')
        
        # Обновляем объект из базы для получения актуального значения rent_amount
        contract.refresh_from_db()
        rent_amount = contract.rent_amount
        
        # Обновляем все planned начисления точным значением из договора
        for accrual in planned_accruals:
            accrual.base_amount = rent_amount
            accrual.final_amount = rent_amount
            # Пересчитываем баланс с учетом уже оплаченной суммы
            accrual.balance = rent_amount - accrual.paid_amount
            accrual.save(update_fields=['base_amount', 'final_amount', 'balance'])
            # Пересчитываем статус (overdue, due, planned)
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