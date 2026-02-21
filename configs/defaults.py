"""
Central configuration for MedGemma/PediScreen — env-driven settings.
Use this for inference, embed server, and shared utilities; backend may extend via app.core.config.
"""
import os
from typing import Optional

try:
    from pydantic import BaseSettings
except ImportError:
    BaseSettings = object  # type: ignore


def _env_bool(name: str, default: str = "true") -> bool:
    return os.getenv(name, default).lower() in ("true", "1", "yes")


class Settings(BaseSettings):
    """Shared settings for model loading, retries, circuit breaker, and fallback."""

    ENV: str = os.getenv("ENV", "dev")
    MODEL_NAME: str = os.getenv("MEDGEMMA_MODEL", "google/medgemma-2b-it")
    ADAPTER_PATH: str = os.getenv("ADAPTER_PATH", "")
    EMB_SERVER_URL: str = os.getenv("EMB_SERVER_URL", "")
    MOCK_FALLBACK: bool = _env_bool("MOCK_FALLBACK", "true")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    RETRY_MAX: int = int(os.getenv("RETRY_MAX", "5"))
    RETRY_BASE: float = float(os.getenv("RETRY_BASE", "0.5"))
    CIRCUIT_BREAKER_ERRORS: int = int(os.getenv("CB_ERRORS", "5"))
    CIRCUIT_BREAKER_WINDOW_SEC: int = int(os.getenv("CB_WINDOW", "60"))
    CIRCUIT_BREAKER_COOLDOWN_SEC: int = int(os.getenv("CB_COOLDOWN", "30"))
    AUDIT_LOG_PATH: str = os.getenv("AUDIT_LOG_PATH", "data/audit.log")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Singleton for use across modules: from configs.defaults import settings
try:
    settings = Settings()
except Exception:
    from types import SimpleNamespace
    settings = SimpleNamespace(
        ENV=os.getenv("ENV", "dev"),
        MODEL_NAME=os.getenv("MEDGEMMA_MODEL", "google/medgemma-2b-it"),
        ADAPTER_PATH=os.getenv("ADAPTER_PATH", ""),
        EMB_SERVER_URL=os.getenv("EMB_SERVER_URL", ""),
        MOCK_FALLBACK=_env_bool("MOCK_FALLBACK", "true"),
        LOG_LEVEL=os.getenv("LOG_LEVEL", "INFO"),
        RETRY_MAX=int(os.getenv("RETRY_MAX", "5")),
        RETRY_BASE=float(os.getenv("RETRY_BASE", "0.5")),
        CIRCUIT_BREAKER_ERRORS=int(os.getenv("CB_ERRORS", "5")),
        CIRCUIT_BREAKER_WINDOW_SEC=int(os.getenv("CB_WINDOW", "60")),
        CIRCUIT_BREAKER_COOLDOWN_SEC=int(os.getenv("CB_COOLDOWN", "30")),
        AUDIT_LOG_PATH=os.getenv("AUDIT_LOG_PATH", "data/audit.log"),
    )
