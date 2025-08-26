from datetime import datetime, timedelta, timezone
from typing import Any, Dict
from uuid import uuid4
from jose import jwt, JWTError
from passlib.context import CryptContext
from ..core.config import get_settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()


def verify_password(plain_password: str, hashed_password: str) -> bool:
	return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
	return pwd_context.hash(password)


def _create_jwt_token(subject: str, jti: str, expires_delta: timedelta, secret_key: str) -> str:
	now = datetime.now(timezone.utc)
	to_encode: Dict[str, Any] = {
		"sub": subject,
		"jti": jti,
		"iat": int(now.timestamp()),
		"exp": int((now + expires_delta).timestamp()),
	}
	return jwt.encode(to_encode, secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: int, role: str) -> str:
	jti = str(uuid4())
	expires = timedelta(minutes=settings.access_token_expire_minutes)
	token = _create_jwt_token(str(user_id), jti, expires, settings.jwt_secret_key)
	return token


def create_refresh_token(user_id: int) -> tuple[str, str, datetime]:
	jti = str(uuid4())
	expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
	token = _create_jwt_token(str(user_id), jti, expires_at - datetime.now(timezone.utc), settings.jwt_refresh_secret_key)
	return token, jti, expires_at


def decode_access_token(token: str) -> Dict[str, Any]:
	return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])


def decode_refresh_token(token: str) -> Dict[str, Any]:
	return jwt.decode(token, settings.jwt_refresh_secret_key, algorithms=[settings.jwt_algorithm])