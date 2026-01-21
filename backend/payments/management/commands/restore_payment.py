"""
Django management команда для восстановления удаленного платежа
Использование: python manage.py restore_payment <contract_number> <amount> <payment_date> <account_id> [comment]
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from datetime import datetime
from payments.models import Payment
from payments.services import PaymentAllocationService
from accruals.models import Accrual
from accruals.services import AccrualService
from contracts.models import Contract
from accounts.models import Account
from accounts.services import AccountService


class Command(BaseCommand):
    help = 'Восстановить удаленный платеж'

    def add_arguments(self, parser):
        parser.add_argument('contract_number', type=str, help='Номер договора')
        parser.add_argument('amount', type=Decimal, help='Сумма платежа')
        parser.add_argument('payment_date', type=str, help='Дата платежа (YYYY-MM-DD)')
        parser.add_argument('account_id', type=int, help='ID счета')
        parser.add_argument('--comment', type=str, default='Восстановленный платеж', help='Комментарий')

    def handle(self, *args, **options):
        contract_number = options['contract_number']
        amount = options['amount']
        payment_date_str = options['payment_date']
        account_id = options['account_id']
        comment = options['comment']

        try:
            # Парсим дату
            payment_date = datetime.strptime(payment_date_str, '%Y-%m-%d').date()
        except ValueError:
            self.stdout.write(self.style.ERROR(f'Неверный формат даты: {payment_date_str}. Используйте YYYY-MM-DD'))
            return

        try:
            # Получаем договор
            contract = Contract.objects.get(number=contract_number)
            self.stdout.write(f'Найден договор: {contract.number} ({contract.tenant.name})')
        except Contract.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Договор {contract_number} не найден'))
            return

        try:
            # Получаем счет
            account = Account.objects.get(id=account_id, is_active=True)
            self.stdout.write(f'Найден счет: {account.name}')
        except Account.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Счет с ID {account_id} не найден или неактивен'))
            return

        # Проверяем начисления с остатком
        accruals_with_balance = Accrual.objects.filter(
            contract=contract,
            balance__gt=0
        ).order_by('due_date')

        if not accruals_with_balance.exists():
            self.stdout.write(self.style.WARNING('Нет начислений с остатком для распределения платежа'))
            return

        self.stdout.write(f'\nНачисления с остатком:')
        total_balance = Decimal('0')
        for accrual in accruals_with_balance:
            self.stdout.write(f'  - Начисление #{accrual.id}: остаток {accrual.balance} сом (период: {accrual.period_start} - {accrual.period_end})')
            total_balance += accrual.balance

        self.stdout.write(f'\nОбщий остаток: {total_balance} сом')
        self.stdout.write(f'Сумма платежа: {amount} сом')

        if not self.confirm():
            self.stdout.write(self.style.WARNING('Операция отменена'))
            return

        try:
            with transaction.atomic():
                # Создаем платеж
                payment = Payment.objects.create(
                    contract=contract,
                    account=account,
                    amount=amount,
                    payment_date=payment_date,
                    comment=comment
                )
                self.stdout.write(self.style.SUCCESS(f'\nСоздан платеж #{payment.id}'))

                # Распределяем платеж по начислениям (FIFO)
                allocations = PaymentAllocationService.allocate_payment_fifo(payment)
                self.stdout.write(f'Распределено на {len(allocations)} начислений')

                # Обновляем статусы начислений
                for allocation in allocations:
                    AccrualService.recalculate_accrual(allocation.accrual)
                    self.stdout.write(f'  - Начисление #{allocation.accrual.id}: распределено {allocation.amount} сом')

                # Создаем транзакцию по счету (поступление)
                AccountService.add_transaction(
                    account=account,
                    transaction_type='income',
                    amount=amount,
                    transaction_date=payment_date,
                    comment=f'Восстановленное поступление по договору {contract.number}. {comment}',
                    related_payment=payment,
                    created_by=None
                )
                self.stdout.write(f'Создана транзакция по счету {account.name}')

                self.stdout.write(self.style.SUCCESS(f'\n✓ Платеж успешно восстановлен!'))
                self.stdout.write(f'  ID платежа: {payment.id}')
                self.stdout.write(f'  Сумма: {payment.amount} сом')
                self.stdout.write(f'  Распределено: {payment.allocated_amount} сом')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\nОшибка при восстановлении платежа: {str(e)}'))
            raise

    def confirm(self):
        """Подтверждение операции"""
        response = input('\nПродолжить? (yes/no): ')
        return response.lower() in ['yes', 'y', 'да', 'д']
