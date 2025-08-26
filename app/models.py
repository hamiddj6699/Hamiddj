from datetime import datetime
from typing import Optional, List
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from .db import Base


class User(Base):
	__tablename__ = "users"

	id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
	email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
	full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
	hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
	is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
	role: Mapped[str] = mapped_column(String(32), default="user", nullable=False)
	created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
	updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

	account: Mapped["Account"] = relationship("Account", back_populates="user", uselist=False)
	refresh_tokens: Mapped[List["RefreshToken"]] = relationship("RefreshToken", back_populates="user")


class Account(Base):
	__tablename__ = "accounts"

	id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
	user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
	balance_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
	created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
	updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

	user: Mapped[User] = relationship("User", back_populates="account")
	outgoing_transactions: Mapped[List["Transaction"]] = relationship("Transaction", back_populates="from_account", foreign_keys="Transaction.from_account_id")
	incoming_transactions: Mapped[List["Transaction"]] = relationship("Transaction", back_populates="to_account", foreign_keys="Transaction.to_account_id")


class Transaction(Base):
	__tablename__ = "transactions"

	id: Mapped[int] = mapped_column(Integer, primary_key=True)
	from_account_id: Mapped[Optional[int]] = mapped_column(ForeignKey("accounts.id"), nullable=True)
	to_account_id: Mapped[Optional[int]] = mapped_column(ForeignKey("accounts.id"), nullable=True)
	amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
	description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
	created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

	from_account: Mapped[Optional[Account]] = relationship("Account", foreign_keys=[from_account_id], back_populates="outgoing_transactions")
	to_account: Mapped[Optional[Account]] = relationship("Account", foreign_keys=[to_account_id], back_populates="incoming_transactions")


class RefreshToken(Base):
	__tablename__ = "refresh_tokens"
	__table_args__ = (
		UniqueConstraint("jti", name="uq_refresh_token_jti"),
	)

	id: Mapped[int] = mapped_column(Integer, primary_key=True)
	jti: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
	user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
	expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
	revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
	created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

	user: Mapped[User] = relationship("User", back_populates="refresh_tokens")