from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session
from .db import get_db
from .core.security import decode_access_token
from .models import User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
	credentials_exception = HTTPException(
		status_code=status.HTTP_401_UNAUTHORIZED,
		detail="Could not validate credentials",
		headers={"WWW-Authenticate": "Bearer"},
	)
	try:
		payload = decode_access_token(token)
		sub = payload.get("sub")
		if sub is None:
			raise credentials_exception
		user_id = int(sub)
	except (JWTError, ValueError):
		raise credentials_exception

	user = db.get(User, user_id)
	if user is None or not user.is_active:
		raise credentials_exception
	return user


def require_roles(*allowed_roles: str):
	def dependency(user: User = Depends(get_current_user)) -> User:
		if user.role not in allowed_roles:
			raise HTTPException(status_code=403, detail="Insufficient permissions")
		return user
	return dependency