from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./data/typeform.db"
    cors_origins: list[str] = ["http://127.0.0.1:3000", "http://localhost:3000"]
    max_request_bytes: int = 1_048_576


@lru_cache
def get_settings() -> Settings:
    return Settings()
