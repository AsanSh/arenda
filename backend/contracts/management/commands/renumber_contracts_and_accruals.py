"""
Переводит номера договоров в формат AMT-YYYY-DDMM-XXX и создаёт начисления для договоров без начислений.

Формат: AMT — сервис, YYYY — год создания, DDMM — дата (день+месяц, напр. 3101), XXX — порядковый номер за день (001, 002, …).
Дата берётся из created_at договора.

Использование:
  python manage.py renumber_contracts_and_accruals
  python manage.py renumber_contracts_and_accruals --no-accruals   # только перенумеровать, не создавать начисления
  python manage.py renumber_contracts_and_accruals --dry-run        # показать, что будет сделано, без изменений в БД

Через Docker: cd infra && docker compose run --rm backend python manage.py renumber_contracts_and_accruals
"""
from collections import defaultdict
from django.core.management.base import BaseCommand
from django.db import transaction

from contracts.models import Contract
from contracts.services import ContractService, SERVICE_PREFIX
from accruals.models import Accrual
from accruals.services import AccrualService


class Command(BaseCommand):
    help = 'Переводит номера договоров в формат AMT-YYYY-DDMM-XXX и создаёт начисления для договоров без начислений'

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-accruals',
            action='store_true',
            help='Только перенумеровать договоры, не создавать начисления',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Показать план изменений без записи в БД',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        do_accruals = not options['no_accruals']

        contracts = list(Contract.objects.all().order_by('created_at', 'id'))
        if not contracts:
            self.stdout.write('Договоров нет.')
            return

        # Группируем по дате создания (год + DDMM) для порядка номеров за день
        by_date = defaultdict(list)
        for c in contracts:
            d = c.created_at.date()
            key = (d.year, f"{d.day:02d}{d.month:02d}")
            by_date[key].append(c)

        # План: для каждой даты — 001, 002, 003...
        plan = []
        for (year, ddmm), group in sorted(by_date.items()):
            for seq, contract in enumerate(group, start=1):
                new_number = f"{SERVICE_PREFIX}-{year}-{ddmm}-{seq:03d}"
                plan.append((contract, new_number))

        if dry_run:
            self.stdout.write('DRY-RUN: следующие номера будут присвоены:')
            for contract, new_number in plan:
                self.stdout.write(f'  {contract.number} -> {new_number} (id={contract.id})')
            if do_accruals:
                no_accruals = [c for c in contracts if not Accrual.objects.filter(contract=c).exists()]
                self.stdout.write(f'\nНачисления будут созданы для {len(no_accruals)} договоров без начислений.')
            return

        with transaction.atomic():
            # Шаг 1: временные номера, чтобы не нарушить уникальность
            for contract in contracts:
                contract.number = f"{SERVICE_PREFIX}-TMP-{contract.id}"
                contract.save(update_fields=['number'])

            # Шаг 2: присваиваем итоговые номера
            for contract, new_number in plan:
                contract.number = new_number
                contract.save(update_fields=['number'])
                self.stdout.write(f'  {contract.id}: {new_number}')

            self.stdout.write(self.style.SUCCESS(f'Перенумеровано договоров: {len(contracts)}'))

            # Шаг 3: начисления для договоров без начислений
            if do_accruals:
                created = 0
                for contract in contracts:
                    if not Accrual.objects.filter(contract=contract).exists():
                        AccrualService.generate_accruals_for_contract(contract)
                        created += 1
                        self.stdout.write(f'  Созданы начисления для договора {contract.number}')
                self.stdout.write(self.style.SUCCESS(f'Начисления созданы для договоров: {created}'))
