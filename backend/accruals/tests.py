"""
Тесты для проверки точного совпадения сумм начислений со ставкой аренды из договора
"""
from django.test import TestCase
from decimal import Decimal
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from contracts.models import Contract
from properties.models import Property
from core.models import Tenant
from accruals.models import Accrual
from accruals.services import AccrualService


class AccrualAmountTests(TestCase):
    """Тесты на точное совпадение сумм начислений со ставкой аренды"""

    def setUp(self):
        """Создаем тестовые данные"""
        # Создаем объект недвижимости
        self.property = Property.objects.create(
            name='Тестовый объект',
            address='Тестовый адрес',
            property_type='apartment'
        )
        
        # Создаем арендатора
        self.tenant = Tenant.objects.create(
            name='Тестовый арендатор',
            contact_person='Тест',
            email='test@test.com',
            phone='+996555123456'
        )

    def test_accrual_amount_equals_contract_rent_30000(self):
        """Тест: начисление должно быть ровно 30000.00 для ставки 30000"""
        contract = Contract.objects.create(
            number='TEST-001',
            signed_at=date.today(),
            property=self.property,
            tenant=self.tenant,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            rent_amount=Decimal('30000.00'),
            currency='KGS',
            status='active'
        )
        
        # Генерируем начисления
        AccrualService.generate_accruals_for_contract(contract)
        
        # Проверяем все начисления
        accruals = Accrual.objects.filter(contract=contract, utility_type='rent')
        self.assertGreater(accruals.count(), 0, 'Должны быть созданы начисления')
        
        for accrual in accruals:
            self.assertEqual(
                accrual.base_amount,
                Decimal('30000.00'),
                f'base_amount должно быть 30000.00, получено {accrual.base_amount}'
            )
            self.assertEqual(
                accrual.final_amount,
                Decimal('30000.00'),
                f'final_amount должно быть 30000.00, получено {accrual.final_amount}'
            )
            self.assertEqual(
                accrual.base_amount,
                contract.rent_amount,
                f'base_amount должно совпадать с contract.rent_amount'
            )

    def test_accrual_amount_equals_contract_rent_100000(self):
        """Тест: начисление должно быть ровно 100000.00 для ставки 100000"""
        contract = Contract.objects.create(
            number='TEST-002',
            signed_at=date.today(),
            property=self.property,
            tenant=self.tenant,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            rent_amount=Decimal('100000.00'),
            currency='KGS',
            status='active'
        )
        
        # Генерируем начисления
        AccrualService.generate_accruals_for_contract(contract)
        
        # Проверяем все начисления
        accruals = Accrual.objects.filter(contract=contract, utility_type='rent')
        self.assertGreater(accruals.count(), 0, 'Должны быть созданы начисления')
        
        for accrual in accruals:
            self.assertEqual(
                accrual.base_amount,
                Decimal('100000.00'),
                f'base_amount должно быть 100000.00, получено {accrual.base_amount}'
            )
            self.assertEqual(
                accrual.final_amount,
                Decimal('100000.00'),
                f'final_amount должно быть 100000.00, получено {accrual.final_amount}'
            )
            self.assertEqual(
                accrual.base_amount,
                contract.rent_amount,
                f'base_amount должно совпадать с contract.rent_amount'
            )

    def test_multiple_periods_same_amount(self):
        """Тест: несколько периодов должны иметь одинаковую сумму"""
        contract = Contract.objects.create(
            number='TEST-003',
            signed_at=date.today(),
            property=self.property,
            tenant=self.tenant,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 4, 30),  # 4 месяца
            rent_amount=Decimal('50000.00'),
            currency='KGS',
            status='active'
        )
        
        # Генерируем начисления
        AccrualService.generate_accruals_for_contract(contract)
        
        # Проверяем все начисления
        accruals = Accrual.objects.filter(contract=contract, utility_type='rent').order_by('period_start')
        self.assertGreaterEqual(accruals.count(), 3, 'Должно быть создано минимум 3 начисления')
        
        # Все начисления должны иметь одинаковую сумму
        amounts = [accrual.base_amount for accrual in accruals]
        self.assertTrue(
            all(amount == Decimal('50000.00') for amount in amounts),
            f'Все начисления должны быть 50000.00, получено: {amounts}'
        )
        
        # Все суммы должны совпадать со ставкой договора
        for accrual in accruals:
            self.assertEqual(
                accrual.base_amount,
                contract.rent_amount,
                f'Начисление {accrual.id} должно совпадать с contract.rent_amount'
            )

    def test_no_proportional_calculation(self):
        """Тест: не должно быть пропорциональных расчетов по дням"""
        contract = Contract.objects.create(
            number='TEST-004',
            signed_at=date.today(),
            property=self.property,
            tenant=self.tenant,
            start_date=date(2026, 1, 15),  # Начало не с 1 числа
            end_date=date(2026, 2, 20),  # Короткий период
            rent_amount=Decimal('30000.00'),
            currency='KGS',
            status='active'
        )
        
        # Генерируем начисления
        AccrualService.generate_accruals_for_contract(contract)
        
        # Проверяем, что сумма не зависит от количества дней в периоде
        accruals = Accrual.objects.filter(contract=contract, utility_type='rent')
        
        for accrual in accruals:
            # Сумма должна быть ровно 30000.00, независимо от периода
            self.assertEqual(
                accrual.base_amount,
                Decimal('30000.00'),
                f'Сумма должна быть фиксированной 30000.00, независимо от периода. '
                f'Получено: {accrual.base_amount} для периода {accrual.period_start} - {accrual.period_end}'
            )
            
            # Проверяем, что нет пропорциональных расчетов
            days_in_period = (accrual.period_end - accrual.period_start).days + 1
            # Если бы был пропорциональный расчет, сумма была бы меньше
            # Но мы требуем фиксированную сумму
            self.assertEqual(
                accrual.base_amount,
                contract.rent_amount,
                'Сумма должна быть равна ставке договора, без пропорций'
            )

    def test_fix_accruals_updates_amounts(self):
        """Тест: fix_accruals_for_contract исправляет суммы"""
        contract = Contract.objects.create(
            number='TEST-005',
            signed_at=date.today(),
            property=self.property,
            tenant=self.tenant,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 3, 31),
            rent_amount=Decimal('30000.00'),
            currency='KGS',
            status='active'
        )
        
        # Создаем начисление с неправильной суммой
        accrual = Accrual.objects.create(
            contract=contract,
            period_start=date(2026, 1, 1),
            period_end=date(2026, 1, 31),
            due_date=date(2026, 1, 25),
            base_amount=Decimal('29999.96'),  # Неправильная сумма
            final_amount=Decimal('29999.96'),
            balance=Decimal('29999.96'),
            status='planned',
            utility_type='rent'
        )
        
        # Исправляем начисления
        AccrualService.fix_accruals_for_contract(contract)
        
        # Проверяем, что сумма исправлена
        accrual.refresh_from_db()
        self.assertEqual(
            accrual.base_amount,
            Decimal('30000.00'),
            f'Сумма должна быть исправлена на 30000.00, получено {accrual.base_amount}'
        )
        self.assertEqual(
            accrual.final_amount,
            Decimal('30000.00'),
            f'final_amount должно быть исправлено на 30000.00, получено {accrual.final_amount}'
        )
