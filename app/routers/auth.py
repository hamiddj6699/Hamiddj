from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status

from ..schemas import RegisterRequest, LoginRequest, RefreshRequest, TokenPair, UserOut
from ..security import hash_password, verify_password, create_jwt_token, decode_jwt_token
from ..config import settings
from ..datastore import store
from ..deps import get_current_user


router = APIRouter()


@router.post("/register", response_model=UserOut)
def register(payload: RegisterRequest) -> UserOut:
    try:
        user = store.create_user(
            username=payload.username,
            password_hash=hash_password(payload.password),
            initial_deposit=payload.initial_deposit,
        )
        return UserOut(username=user.username)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest) -> TokenPair:
    user = store.get_user(payload.username)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access = create_jwt_token(
        subject=user.username,
        expires_delta=settings.access_token_expires,
        token_type="access",
    )
    refresh = create_jwt_token(
        subject=user.username,
        expires_delta=settings.refresh_token_expires,
        token_type="refresh",
    )
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest) -> TokenPair:
    try:
        decoded = decode_jwt_token(payload.refresh_token, expected_type="refresh")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    username = decoded.get("sub")
    if username is None or store.get_user(username) is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    access = create_jwt_token(
        subject=username,
        expires_delta=settings.access_token_expires,
        token_type="access",
    )
    refresh_token = create_jwt_token(
        subject=username,
        expires_delta=settings.refresh_token_expires,
        token_type="refresh",
    )
    return TokenPair(access_token=access, refresh_token=refresh_token)


@router.get("/whoami", response_model=UserOut)
def whoami(user=Depends(get_current_user)) -> UserOut:
    return UserOut(username=user.username)