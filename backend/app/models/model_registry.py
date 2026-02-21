"""
Model registry: register and get backend by name.
Environment MODEL_BACKEND=medgemma|mock switches without code changes.
"""
from typing import Any, Dict, Optional

from app.models.interface import BaseModel


class ModelRegistry:
    def __init__(self) -> None:
        self._models: Dict[str, BaseModel] = {}

    def register(self, name: str, model: BaseModel) -> None:
        self._models[name] = model

    def get(self, name: str) -> Optional[BaseModel]:
        return self._models.get(name)

    def get_or_default(self, name: Optional[str], default: str = "mock") -> BaseModel:
        key = name or default
        m = self._models.get(key)
        if m is None:
            m = self._models.get(default)
        if m is None:
            raise ValueError(f"Model not found: {key} (and no default '{default}')")
        return m


# Global registry; populated by app startup or explicit registration
_registry = ModelRegistry()


def get_registry() -> ModelRegistry:
    return _registry
