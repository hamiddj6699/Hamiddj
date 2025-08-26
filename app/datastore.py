from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Dict, Optional
import uuid


@dataclass
class User:
    username: str
    password_hash: str
    default_account_id: str


@dataclass
class Account:
    account_id: str
    owner: str
    balance: Decimal = field(default_factory=lambda: Decimal("0"))


class InMemoryStore:
    def __init__(self) -> None:
        self.username_to_user: Dict[str, User] = {}
        self.account_id_to_account: Dict[str, Account] = {}

    def create_user(self, username: str, password_hash: str, initial_deposit: Optional[Decimal]) -> User:
        if username in self.username_to_user:
            raise ValueError("username already exists")
        account_id = str(uuid.uuid4())
        account = Account(account_id=account_id, owner=username)
        if initial_deposit is not None:
            account.balance = Decimal(initial_deposit)
        self.account_id_to_account[account_id] = account
        user = User(username=username, password_hash=password_hash, default_account_id=account_id)
        self.username_to_user[username] = user
        return user

    def get_user(self, username: str) -> Optional[User]:
        return self.username_to_user.get(username)

    def get_accounts_for_user(self, username: str) -> Dict[str, Account]:
        return {acc_id: acc for acc_id, acc in self.account_id_to_account.items() if acc.owner == username}

    def get_account(self, account_id: str) -> Optional[Account]:
        return self.account_id_to_account.get(account_id)

    def transfer(self, from_account_id: str, to_account_id: str, amount: Decimal) -> tuple[Account, Account]:
        if from_account_id == to_account_id:
            raise ValueError("cannot transfer to the same account")
        from_account = self.get_account(from_account_id)
        to_account = self.get_account(to_account_id)
        if from_account is None or to_account is None:
            raise ValueError("account not found")
        if from_account.balance < amount:
            raise ValueError("insufficient funds")
        from_account.balance -= amount
        to_account.balance += amount
        return from_account, to_account


store = InMemoryStore()