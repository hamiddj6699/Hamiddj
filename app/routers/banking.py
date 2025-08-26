from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status

from ..schemas import AccountsResponse, AccountOut, TransferRequest, TransferResult
from ..datastore import store
from ..deps import get_current_user


router = APIRouter()


@router.get("/accounts", response_model=AccountsResponse)
def list_accounts(user=Depends(get_current_user)) -> AccountsResponse:
    accounts_map = store.get_accounts_for_user(user.username)
    accounts = [AccountOut(account_id=a.account_id, owner=a.owner, balance=a.balance) for a in accounts_map.values()]
    return AccountsResponse(accounts=accounts)


@router.get("/balance/{account_id}", response_model=AccountOut)
def get_balance(account_id: str, user=Depends(get_current_user)) -> AccountOut:
    account = store.get_account(account_id)
    if account is None or account.owner != user.username:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return AccountOut(account_id=account.account_id, owner=account.owner, balance=account.balance)


@router.post("/transfer", response_model=TransferResult)
def transfer(payload: TransferRequest, user=Depends(get_current_user)) -> TransferResult:
    from_acc = store.get_account(payload.from_account_id)
    to_acc = store.get_account(payload.to_account_id)
    if from_acc is None or to_acc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    if from_acc.owner != user.username:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    try:
        updated_from, updated_to = store.transfer(payload.from_account_id, payload.to_account_id, Decimal(payload.amount))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return TransferResult(
        from_account_id=updated_from.account_id,
        to_account_id=updated_to.account_id,
        amount=Decimal(payload.amount),
        from_balance=updated_from.balance,
        to_balance=updated_to.balance,
    )