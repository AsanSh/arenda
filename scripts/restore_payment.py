#!/usr/bin/env python
"""
Скрипт для восстановления удаленного платежа на 100 000 сом
Запуск: docker compose exec backend python restore_payment.py
"""
import os
import sys
import django

# Настройка Django
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction
from decimal import Decimal
from datetime import date
from payments.models import Payment
from payments.services import PaymentAllocationService
from accruals.models import Accrual
from accruals.services import AccrualService
from contracts.models import Contract
from accounts.models import Account
from accounts.services import AccountService

def restore_payment():
    """Восстановить платеж на 100 000 сом"""
    
    # Параметры платежа (нужно указать правильные значения)
    amount = Decimal('100000')
    payment_date = date.today()  # Можно изменить на нужную дату
    
    # Нужно указать:
    # 1. Номер договора
    # 2. ID счета (обычно "ОсОО ЖиВ сомы")
    
    print("Восстановление платежа на 100 000 сом")
    print("=" * 50)
    
    # Найдем активные договоры с начислениями
    contracts = Contract.objects.filter(status='active')
    print(f"\nНайдено активных договоров: {contracts.count()}")
    
    # Найдем счет "ОсОО ЖиВ сомы"
    account = Account.objects.filter(name__icontains='ЖиВ', currency='KGS').first()
    if not account:
        print("Счет 'ОсОО ЖиВ сомы' не найден. Доступные счета:")
        for acc in Account.objects.filter(is_active=True, currency='KGS'):
            print(f"  - ID: {acc.id}, Название: {acc.name}")
        account_id = input("\nВведите ID счета: ")
        account = Account.objects.get(id=account_id)
    else:
        print(f"Используется счет: {account.name} (ID: {account.id})")
    
    # Покажем договоры с начислениями
    print("\nДоговоры с начислениями, имеющими остаток:")
    for contract in contracts:
        accruals = Accrual.objects.filter(contract=contract, balance__gt=0)
        if accruals.exists():
            total_balance = sum(a.balance for a in accruals)
            print(f"  - {contract.number}: {contract.tenant.name}, остаток: {total_balance} сом")
    
    contract_number = input("\nВведите номер договора (или нажмите Enter для поиска автоматически): ").strip()
    
    if contract_number:
        contract = Contract.objects.get(number=contract_number)
    else:
        # Найдем договор с наибольшим остатком
        max_balance = Decimal('0')
        selected_contract = None
        for contract in contracts:
            accruals = Accrual.objects.filter(contract=contract, balance__gt=0)
            total_balance = sum(a.balance for a in accruals)
            if total_balance > max_balance:
                max_balance = total_balance
                selected_contract = contract
        
        if not selected_contract:
            print("Не найдено договоров с остатком")
            return
        
        contract = selected_contract
        print(f"Выбран договор: {contract.number} ({contract.tenant.name})")
    
    # Проверяем начисления
    accruals = Accrual.objects.filter(contract=contract, balance__gt=0).order_by('due_date')
    if not accruals.exists():
        print(f"У договора {contract.number} нет начислений с остатком")
        return
    
    print(f"\nНачисления с остатком:")
    for accrual in accruals:
        print(f"  - Период: {accrual.period_start} - {accrual.period_end}, остаток: {accrual.balance} сом")
    
    confirm = input(f"\nСоздать платеж на {amount} сом для договора {contract.number}? (yes/no): ")
    if confirm.lower() not in ['yes', 'y', 'да', 'д']:
        print("Отменено")
        return
    
    try:
        with transaction.atomic():
            # Создаем платеж
            payment = Payment.objects.create(
                contract=contract,
                account=account,
                amount=amount,
                payment_date=payment_date,
                comment='Восстановленный платеж'
            )
            print(f"\n✓ Создан платеж #{payment.id}")
            
            # Распределяем платеж по начислениям (FIFO)
            allocations = PaymentAllocationService.allocate_payment_fifo(payment)
            print(f"✓ Распределено на {len(allocations)} начислений")
            
            # Обновляем статусы начислений
            for allocation in allocations:
                AccrualService.recalculate_accrual(allocation.accrual)
                print(f"  - Начисление #{allocation.accrual.id}: распределено {allocation.amount} сом")
            
            # Создаем транзакцию по счету
            AccountService.add_transaction(
                account=account,
                transaction_type='income',
                amount=amount,
                transaction_date=payment_date,
                comment=f'Восстановленное поступление по договору {contract.number}',
                related_payment=payment,
                created_by=None
            )
            print(f"✓ Создана транзакция по счету {account.name}")
            
            print(f"\n✓ Платеж успешно восстановлен!")
            print(f"  ID платежа: {payment.id}")
            print(f"  Сумма: {payment.amount} сом")
            print(f"  Распределено: {payment.allocated_amount} сом")
            
    except Exception as e:
        print(f"\n✗ Ошибка: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    restore_payment()
