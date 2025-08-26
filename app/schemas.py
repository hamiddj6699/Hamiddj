from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserBase(BaseModel):
	email: EmailStr
	full_name: Optional[str] = None


class UserCreate(UserBase):
	password: str = Field(min_length=8)


class UserOut(UserBase):
	id: int
	role: str
	created_at: datetime

	model_config = ConfigDict(from_attributes=True)


class TokenPair(BaseModel):
	access_token: str
	refresh_token: str
	token_type: str = "bearer"


class TokenPayload(BaseModel):
	sub: str
	jti: str
	exp: int
	role: Optional[str] = None


class RefreshRequest(BaseModel):
	refresh_token: str


class LogoutRequest(BaseModel):
	refresh_token: str


class AccountOut(BaseModel):
	balance: Decimal


class TransferRequest(BaseModel):
	to_email: EmailStr
	amount: Decimal = Field(gt=0)
	description: Optional[str] = None


class TransactionOut(BaseModel):
	id: int
	from_email: Optional[EmailStr] = None
	to_email: Optional[EmailStr] = None
	amount: Decimal
	description: Optional[str] = None
	created_at: datetime

	model_config = ConfigDict(from_attributes=True)