"""
Base model interface for HAI model layer.
All models (MedGemma, adapters, mock fallback) must implement this.
Per Cursor prompt: Model architecture + MCP tools refactor.
"""
from abc import ABC, abstractmethod
from typing import Any, Dict


class BaseModel(ABC):
    """Abstract base for inference models (MedGemma, mock, adapters)."""

    @abstractmethod
    def infer(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Run inference. input_data and return shape are contract-specific."""
        pass

    @abstractmethod
    def health_check(self) -> bool:
        """Return True if model is loadable and ready."""
        pass

    @abstractmethod
    def metadata(self) -> Dict[str, Any]:
        """Return model id, version, prompt_version, etc."""
        pass
