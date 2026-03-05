"""
Бизнес-логика договоров аренды.
Вся логика создания/обновления/удаления договоров — только здесь.
"""
from datetime import date
from decimal import Decimal
from django.db import transaction

from .models import Contract
from accruals.models import Accrual
from accruals.services import AccrualService
from deposits.models import Deposit
from payments.models import Payment, PaymentAllocation
from payments.services import PaymentAllocationService

SERVICE_PREFIX = "AMT"


class ContractService:
    """Сервис договоров аренды."""

    @staticmethod
    def generate_contract_number() -> str:
        """
        Генерация номера договора: AMT-YYYY-DDMM-XXX.
        AMT — название сервиса, YYYY — год создания, DDMM — дата (день+месяц, напр. 31 января = 3101, 25 февраля = 2502), XXX — порядковый номер за день (001, 002, …).
        """
        today = date.today()
        year = today.year
        day_month = f"{today.day:02d}{today.month:02d}"  # DDMM, напр. 3101, 2502
        prefix = f"{SERVICE_PREFIX}-{year}-{day_month}-"
        last = (
            Contract.objects.filter(number__startswith=prefix)
            .order_by("-number")
            .first()
        )
        if last:
            try:
                seq = int(last.number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        return f"{prefix}{seq:03d}"

    @staticmethod
    @transaction.atomic
    def create_contract_with_accruals_and_deposit(contract: Contract) -> None:
        """
        После создания договора: генерация начислений, депозит при необходимости, аванс.
        Вызывается из view после serializer.save().
        """
        AccrualService.generate_accruals_for_contract(contract)

        if contract.deposit_enabled:
            from accounts.models import Account

            account = Account.objects.filter(
                owner=contract.tenant,
                currency=contract.currency,
                is_active=True,
            ).first()
            if not account:
                account = Account.objects.create(
                    name=f"{contract.tenant.name} ({contract.get_currency_display()})",
                    account_type="bank",
                    currency=contract.currency,
                    owner=contract.tenant,
                    is_active=True,
                )
            Deposit.objects.create(
                contract=contract,
                amount=contract.deposit_amount,
                balance=Decimal("0"),
            )
            account.balance += contract.deposit_amount
            account.save()

        if contract.advance_enabled:
            advance_amount = contract.rent_amount * contract.advance_months
            payment = Payment.objects.create(
                contract=contract,
                amount=advance_amount,
                payment_date=contract.start_date,
                comment="Аванс",
            )
            PaymentAllocationService.allocate_payment_fifo(payment)

    @staticmethod
    @transaction.atomic
    def update_contract_accruals(
        contract: Contract,
        old_status: str,
        old_rent_amount: Decimal,
        old_start_date,
        old_end_date,
    ) -> None:
        """Обновление начислений при изменении договора."""
        if contract.status == "active" and old_status != "active":
            if not Accrual.objects.filter(contract=contract).exists():
                AccrualService.generate_accruals_for_contract(contract)
        elif old_rent_amount != contract.rent_amount:
            AccrualService.fix_accruals_for_contract(contract)
        elif old_start_date != contract.start_date or old_end_date != contract.end_date:
            Accrual.objects.filter(contract=contract, status="planned").delete()
            AccrualService.generate_accruals_for_contract(contract)

    @staticmethod
    @transaction.atomic
    def delete_contract_cascade(contract: Contract) -> dict:
        """Удаление договора и связанных платежей/аллокаций. Возвращает сводку."""
        accruals_count = Accrual.objects.filter(contract=contract).count()
        payment_ids = list(
            Payment.objects.filter(contract=contract).values_list("id", flat=True)
        )
        if payment_ids:
            PaymentAllocation.objects.filter(payment_id__in=payment_ids).delete()
        payments_count = Payment.objects.filter(contract=contract).delete()[0]
        deposits_count = Deposit.objects.filter(contract=contract).exists()
        number = contract.number
        contract.delete()
        return {
            "message": f'Договор "{number}" и связанные операции удалены. '
            f"Начислений: {accruals_count}, платежей: {payments_count}, депозитов: {1 if deposits_count else 0}.",
            "accruals_count": accruals_count,
            "payments_count": payments_count,
        }

    @staticmethod
    def end_contract(contract: Contract) -> Contract:
        """Завершение договора."""
        contract.status = "ended"
        contract.save(update_fields=["status"])
        return contract
