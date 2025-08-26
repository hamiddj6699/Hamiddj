from functools import lru_cache
from secrets import token_urlsafe
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
	app_name: str = "Banking API"
	environment: str = "development"
	database_url: str = "sqlite:////workspace/banking.db"

	jwt_algorithm: str = "HS256"
	access_token_expire_minutes: int = 15
	refresh_token_expire_days: int = 7
	jwt_secret_key: str = token_urlsafe(48)
	jwt_refresh_secret_key: str = token_urlsafe(48)

	model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
	return Settings()