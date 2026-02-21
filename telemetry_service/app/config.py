# telemetry_service/app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENV: str = "dev"
    APP_NAME: str = "pedi-telemetry"
    DEBUG: bool = True

    # Postgres
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@postgres:5432/pediscreen"

    # Redis for Celery broker
    REDIS_URL: str = "redis://redis:6379/0"

    # BigQuery
    BIGQUERY_PROJECT: str = ""
    BIGQUERY_DATASET: str = "pedi_telemetry"
    ENABLE_BIGQUERY: bool = False

    # Sentry
    SENTRY_DSN: str = ""

    # Other
    MAX_EVENTS_CACHE: int = 5000


settings = Settings()
