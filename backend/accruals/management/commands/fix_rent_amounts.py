"""
Management command to fix all accrual amounts to match contract rent_amount exactly.
This ensures that all rent accruals use the exact fixed monthly rent amount from contracts
without any proportional calculations or rounding errors.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from accruals.models import Accrual
from contracts.models import Contract


class Command(BaseCommand):
    help = 'Исправляет суммы в начислениях аренды, чтобы они точно совпадали со ставкой аренды из договора'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Показать что будет исправлено без реального изменения данных',
        )
        parser.add_argument(
            '--contract-id',
            type=int,
            help='Исправить начисления только для конкретного договора',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Исправить все начисления, включая оплаченные (не рекомендуется)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        contract_id = options.get('contract_id')
        force = options.get('force', False)

        if dry_run:
            self.stdout.write(self.style.WARNING('РЕЖИМ ПРОВЕРКИ (dry-run) - данные не будут изменены'))

        # Получаем все начисления типа rent
        accruals_query = Accrual.objects.filter(utility_type='rent').select_related('contract')
        
        if contract_id:
            accruals_query = accruals_query.filter(contract_id=contract_id)
            self.stdout.write(f'Обработка договора ID: {contract_id}')
        else:
            self.stdout.write('Обработка всех договоров')

        total_fixed = 0
        total_checked = 0
        errors = []

        with transaction.atomic():
            for accrual in accruals_query:
                total_checked += 1
                contract = accrual.contract
                contract.refresh_from_db()
                
                # Получаем точное значение из договора
                expected_amount = contract.rent_amount
                current_base = accrual.base_amount
                current_final = accrual.final_amount
                
                # Проверяем, нужно ли исправление
                if current_base != expected_amount or current_final != expected_amount:
                    if not dry_run:
                        # Исправляем planned начисления (не трогаем оплаченные, если не --force)
                        if accrual.status == 'planned' or force:
                            accrual.base_amount = expected_amount
                            accrual.final_amount = expected_amount
                            accrual.balance = expected_amount - accrual.paid_amount
                            accrual.save(update_fields=['base_amount', 'final_amount', 'balance'])
                            total_fixed += 1
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f'✓ Договор {contract.number}: '
                                    f'{current_base} → {expected_amount} (ID начисления: {accrual.id}, статус: {accrual.status})'
                                )
                            )
                        else:
                            # Для оплаченных начислений только предупреждаем
                            self.stdout.write(
                                self.style.WARNING(
                                    f'⚠ Договор {contract.number}: '
                                    f'Начисление {accrual.id} имеет статус {accrual.status}, '
                                    f'не исправлено (base: {current_base}, должно быть: {expected_amount}). '
                                    f'Используйте --force для исправления всех начислений.'
                                )
                            )
                    else:
                        # Dry run - только показываем
                        total_fixed += 1
                        self.stdout.write(
                            f'[DRY-RUN] Договор {contract.number}: '
                            f'{current_base} → {expected_amount} (ID начисления: {accrual.id}, статус: {accrual.status})'
                        )

            if dry_run:
                self.stdout.write(self.style.WARNING(f'\n[DRY-RUN] Найдено начислений для исправления: {total_fixed}'))
            else:
                self.stdout.write(self.style.SUCCESS(f'\n✓ Проверено начислений: {total_checked}'))
                self.stdout.write(self.style.SUCCESS(f'✓ Исправлено начислений: {total_fixed}'))
