from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models, schemas
from ..deps import get_current_user


router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("/me/balance", response_model=schemas.AccountOut)
def get_my_balance(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
	account = db.query(models.Account).filter(models.Account.user_id == user.id).first()
	if account is None:
		raise HTTPException(status_code=404, detail="Account not found")
	balance = Decimal(account.balance_cents) / Decimal(100)
	return schemas.AccountOut(balance=balance)


@router.post("/transfer")
def transfer_funds(data: schemas.TransferRequest, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
	if data.amount <= 0:
		raise HTTPException(status_code=400, detail="Amount must be positive")

	amount_cents = int((data.amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))

	sender_account = db.query(models.Account).filter(models.Account.user_id == user.id).with_for_update(read=False).first()
	if sender_account is None:
		raise HTTPException(status_code=404, detail="Sender account not found")

	recipient: Optional[models.User] = db.query(models.User).filter(models.User.email == data.to_email).first()
	if recipient is None:
		raise HTTPException(status_code=404, detail="Recipient not found")

	recipient_account = db.query(models.Account).filter(models.Account.user_id == recipient.id).with_for_update(read=False).first()
	if recipient_account is None:
		raise HTTPException(status_code=404, detail="Recipient account not found")

	if sender_account.id == recipient_account.id:
		raise HTTPException(status_code=400, detail="Cannot transfer to the same account")

	if sender_account.balance_cents < amount_cents:
		raise HTTPException(status_code=400, detail="Insufficient funds")

	# transactional update
	try:
		sender_account.balance_cents -= amount_cents
		recipient_account.balance_cents += amount_cents
		trx = models.Transaction(
			from_account_id=sender_account.id,
			to_account_id=recipient_account.id,
			amount_cents=amount_cents,
			description=data.description,
		)
		db.add(trx)
		db.commit()
	except Exception:
		db.rollback()
		raise

	return {"message": "Transfer completed"}


@router.get("/transactions", response_model=List[schemas.TransactionOut])
def list_transactions(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
	account = db.query(models.Account).filter(models.Account.user_id == user.id).first()
	if account is None:
		raise HTTPException(status_code=404, detail="Account not found")

	trxs = (
		db.query(models.Transaction)
		.filter(
			(models.Transaction.from_account_id == account.id)
			|
			(models.Transaction.to_account_id == account.id)
		)
		.order_by(models.Transaction.created_at.desc())
		.limit(100)
		.all()
	)

	result: List[schemas.TransactionOut] = []
	for t in trxs:
		from_email = None
		to_email = None
		if t.from_account is not None:
			from_email = t.from_account.user.email
		if t.to_account is not None:
			to_email = t.to_account.user.email
		result.append(
			schemas.TransactionOut(
				id=t.id,
				from_email=from_email,
				to_email=to_email,
				amount=Decimal(t.amount_cents) / Decimal(100),
				description=t.description,
				created_at=t.created_at,
			)
		)
	return result