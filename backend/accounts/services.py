from decimal import Decimal
from django.db import transaction
from .models import Account, AccountTransaction


class AccountService:
    """Сервис для работы со счетами"""
    
    @staticmethod
    @transaction.atomic
    def add_transaction(
        account: Account,
        transaction_type: str,
        amount: Decimal,
        transaction_date,
        comment: str = '',
        related_account: Account = None,
        related_payment=None,
        related_expense=None,
        created_by=None
    ):
        """
        Добавить операцию по счету и обновить баланс
        """
        # Определяем, увеличивает или уменьшает операция баланс
        if transaction_type in ['income', 'transfer_in', 'adjustment']:
            account.balance += amount
        elif transaction_type in ['expense', 'transfer_out']:
            if account.balance < amount:
                raise ValueError(f"Недостаточно средств на счете. Баланс: {account.balance}, требуется: {amount}")
            account.balance -= amount
        
        account.save()
        
        # Создаем транзакцию
        account_transaction = AccountTransaction.objects.create(
            account=account,
            transaction_type=transaction_type,
            amount=amount,
            transaction_date=transaction_date,
            related_account=related_account,
            related_payment=related_payment,
            related_expense=related_expense,
            comment=comment,
            created_by=created_by
        )
        
        # Если это перевод, создаем обратную транзакцию на связанном счете
        if transaction_type == 'transfer_out' and related_account:
            AccountService.add_transaction(
                account=related_account,
                transaction_type='transfer_in',
                amount=amount,
                transaction_date=transaction_date,
                comment=f'Перевод со счета {account.name}',
                related_account=account,
                created_by=created_by
            )
        
        return account_transaction
    
    @staticmethod
    def get_total_balance(currency: str = 'KGS') -> Decimal:
        """Получить общий баланс по всем счетам в указанной валюте"""
        accounts = Account.objects.filter(currency=currency, is_active=True)
        return sum(acc.balance for acc in accounts)
