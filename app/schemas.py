from typing import Optional, List
from pydantic import BaseModel, Field, constr, condecimal
from decimal import Decimal


UsernameStr = constr(strip_whitespace=True, min_length=3, max_length=50)
PasswordStr = constr(min_length=6, max_length=128)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    username: UsernameStr
    password: PasswordStr
    initial_deposit: Optional[condecimal(gt=0, max_digits=12, decimal_places=2)] = Field(default=None)


class LoginRequest(BaseModel):
    username: UsernameStr
    password: PasswordStr


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    username: str


class AccountOut(BaseModel):
    account_id: str
    owner: str
    balance: Decimal


class TransferRequest(BaseModel):
    from_account_id: str
    to_account_id: str
    amount: condecimal(gt=0, max_digits=12, decimal_places=2)


class TransferResult(BaseModel):
    from_account_id: str
    to_account_id: str
    amount: Decimal
    from_balance: Decimal
    to_balance: Decimal


class AccountsResponse(BaseModel):
    accounts: List[AccountOut]