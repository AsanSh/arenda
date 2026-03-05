"""
Бизнес-логика депозитов.
Вся логика приёма/списания/возврата депозита — только здесь.
"""
from decimal import Decimal
from django.db import transaction

from .models import Deposit, DepositMovement


class DepositService:
    """Сервис депозитов."""

    @staticmethod
    @transaction.atomic
    def accept_deposit(
        deposit: Deposit, amount: Decimal, comment: str = ""
    ) -> Decimal:
        """Принять сумму на депозит. Возвращает новый баланс."""
        if amount <= 0:
            raise ValueError("Сумма должна быть больше 0")
        deposit.balance += amount
        deposit.save(update_fields=["balance"])
        DepositMovement.objects.create(
            deposit=deposit,
            movement_type="in",
            amount=amount,
            comment=comment or "",
        )
        return deposit.balance

    @staticmethod
    @transaction.atomic
    def withdraw_deposit(
        deposit: Deposit,
        amount: Decimal,
        reason: str = "other",
        comment: str = "",
    ) -> Decimal:
        """Списать сумму с депозита. Возвращает новый баланс."""
        if amount <= 0:
            raise ValueError("Сумма должна быть больше 0")
        if amount > deposit.balance:
            raise ValueError("Недостаточно средств на депозите")
        deposit.balance -= amount
        deposit.save(update_fields=["balance"])
        DepositMovement.objects.create(
            deposit=deposit,
            movement_type="out",
            amount=amount,
            reason=reason,
            comment=comment or "",
        )
        return deposit.balance

    @staticmethod
    @transaction.atomic
    def refund_deposit(deposit: Deposit, comment: str = "") -> Decimal:
        """Вернуть весь остаток депозита. Возвращает сумму возврата."""
        if deposit.balance <= 0:
            raise ValueError("Нет средств для возврата")
        refund_amount = deposit.balance
        deposit.balance = Decimal("0")
        deposit.save(update_fields=["balance"])
        DepositMovement.objects.create(
            deposit=deposit,
            movement_type="refund",
            amount=refund_amount,
            comment=comment or "Возврат депозита",
        )
        return refund_amount
