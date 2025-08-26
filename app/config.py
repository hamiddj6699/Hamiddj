from datetime import timedelta
from pydantic import BaseModel
import os


class Settings(BaseModel):
    app_name: str = "Banking API"
    jwt_secret_key: str = os.environ.get("JWT_SECRET_KEY", "change_me_in_prod")
    jwt_algorithm: str = os.environ.get("JWT_ALGORITHM", "HS256")
    access_token_expires: timedelta = timedelta(minutes=int(os.environ.get("ACCESS_TOKEN_MINUTES", "15")))
    refresh_token_expires: timedelta = timedelta(days=int(os.environ.get("REFRESH_TOKEN_DAYS", "7")))


settings = Settings()  # type: ignore[arg-type]