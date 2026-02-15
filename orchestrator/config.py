"""
Orchestrator configuration — MongoDB for memory, env-based settings.
"""
import os
from typing import Optional


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


class OrchestratorSettings:
    """Orchestrator-specific settings."""

    # MongoDB for agent memory & reflections (optional — graceful degradation when unset)
    MONGODB_URI: str = _env("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB: str = _env("MONGODB_DB", "pediscreen_orchestrator")

    # When True, memory/reflection is disabled (no MongoDB required)
    MEMORY_DISABLED: bool = _env("MEMORY_DISABLED", "0") == "1"

    @classmethod
    def memory_enabled(cls) -> bool:
        return not cls.MEMORY_DISABLED and bool(cls.MONGODB_URI)


settings = OrchestratorSettings()
