from decimal import Decimal
from django.db import transaction
from .models import Payment, PaymentAllocation
from accruals.models import Accrual
from accruals.services import AccrualService


class PaymentAllocationService:
    """Сервис для распределения платежей по начислениям (FIFO)"""
    
    @staticmethod
    @transaction.atomic
    def allocate_payment_fifo(payment: Payment):
        """
        Распределение платежа по начислениям по принципу FIFO:
        1. Сначала просроченные (overdue)
        2. Затем текущие (due)
        3. Затем будущие (planned)
        """
        contract = payment.contract
        remaining_amount = payment.amount
        
        # Получаем начисления по приоритету: сначала просроченные, потом текущие, потом будущие
        accruals = Accrual.objects.filter(
            contract=contract,
            balance__gt=0
        ).order_by(
            'due_date',  # Сначала старые
            'period_start'
        )
        
        allocations_created = []
        
        for accrual in accruals:
            if remaining_amount <= 0:
                break
            
            # Сколько можем зачислить на это начисление
            amount_to_allocate = min(remaining_amount, accrual.balance)
            
            # Создаем распределение
            allocation, created = PaymentAllocation.objects.get_or_create(
                payment=payment,
                accrual=accrual,
                defaults={'amount': amount_to_allocate}
            )
            
            if not created:
                # Если уже существует, обновляем сумму
                allocation.amount += amount_to_allocate
                allocation.save()
            
            allocations_created.append(allocation)
            
            # Обновляем начисление
            accrual.paid_amount += amount_to_allocate
            AccrualService.recalculate_accrual(accrual)
            
            remaining_amount -= amount_to_allocate
        
        # Обновляем распределенную сумму в платеже
        payment.allocated_amount = payment.amount - remaining_amount
        payment.save()
        
        return allocations_created
    
    @staticmethod
    @transaction.atomic
    def reallocate_payment(payment: Payment):
        """
        Перераспределение платежа (отмена старых распределений и создание новых)
        """
        # Удаляем старые распределения и возвращаем суммы в начисления
        for allocation in payment.allocations.all():
            accrual = allocation.accrual
            accrual.paid_amount -= allocation.amount
            AccrualService.recalculate_accrual(accrual)
            allocation.delete()
        
        # Создаем новые распределения
        return PaymentAllocationService.allocate_payment_fifo(payment)
