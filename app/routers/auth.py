from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models, schemas
from ..core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_refresh_token


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
	existing = db.query(models.User).filter(models.User.email == user_in.email).first()
	if existing:
		raise HTTPException(status_code=400, detail="Email already registered")

	user = models.User(
		email=user_in.email,
		full_name=user_in.full_name,
		hashed_password=get_password_hash(user_in.password),
		role="user",
	)
	db.add(user)
	db.flush()

	account = models.Account(user_id=user.id, balance_cents=0)
	db.add(account)
	db.commit()
	db.refresh(user)
	return user


@router.post("/login", response_model=schemas.TokenPair)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
	# We treat username field as email for simplicity
	user: Optional[models.User] = db.query(models.User).filter(models.User.email == form_data.username).first()
	if user is None or not verify_password(form_data.password, user.hashed_password):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

	access_token = create_access_token(user_id=user.id, role=user.role)
	refresh_token, jti, expires_at = create_refresh_token(user_id=user.id)

	rt = models.RefreshToken(jti=jti, user_id=user.id, expires_at=expires_at)
	db.add(rt)
	db.commit()

	return schemas.TokenPair(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=schemas.TokenPair)
def refresh_tokens(payload: schemas.RefreshRequest, db: Session = Depends(get_db)):
	try:
		decoded = decode_refresh_token(payload.refresh_token)
		user_id = int(decoded.get("sub"))
		jti = decoded.get("jti")
	except Exception:
		raise HTTPException(status_code=401, detail="Invalid refresh token")

	rt = db.query(models.RefreshToken).filter(models.RefreshToken.jti == jti).first()
	if rt is None or rt.revoked or rt.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
		raise HTTPException(status_code=401, detail="Refresh token expired or revoked")

	# rotate refresh token
	rt.revoked = True
	access_token = create_access_token(user_id=user_id, role=db.get(models.User, user_id).role)
	new_refresh_token, new_jti, new_expires_at = create_refresh_token(user_id=user_id)
	db.add(models.RefreshToken(jti=new_jti, user_id=user_id, expires_at=new_expires_at))
	db.commit()

	return schemas.TokenPair(access_token=access_token, refresh_token=new_refresh_token)


@router.post("/logout")
def logout(payload: schemas.LogoutRequest, db: Session = Depends(get_db)):
	try:
		decoded = decode_refresh_token(payload.refresh_token)
		jti = decoded.get("jti")
	except Exception:
		raise HTTPException(status_code=401, detail="Invalid refresh token")

	rt = db.query(models.RefreshToken).filter(models.RefreshToken.jti == jti).first()
	if rt is None or rt.revoked:
		return {"message": "Already logged out"}
	rt.revoked = True
	db.commit()
	return {"message": "Logged out"}