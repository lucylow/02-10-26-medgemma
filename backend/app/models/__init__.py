"""
HAI model layer: BaseModel, registry, MedGemma, embedding, risk classifier, post-processor.
"""
from app.models.interface import BaseModel
from app.models.model_registry import ModelRegistry, get_registry
from app.models.medgemma_model import MedGemmaModel
from app.models.embedding_model import EmbeddingModel, MockEmbeddingModel
from app.models.risk_classifier import RiskClassifier, MockRiskClassifier
from app.models.post_processor import validate_and_sanitize, fallback_response, should_fallback
from app.models.mock_model import MockModel

__all__ = [
    "BaseModel",
    "ModelRegistry",
    "get_registry",
    "MedGemmaModel",
    "EmbeddingModel",
    "MockEmbeddingModel",
    "RiskClassifier",
    "MockRiskClassifier",
    "MockModel",
    "validate_and_sanitize",
    "fallback_response",
    "should_fallback",
]


def register_default_models(registry: ModelRegistry) -> None:
    """Register medgemma and mock so MODEL_BACKEND can switch."""
    registry.register("mock", MockModel())
    registry.register("medgemma", MedGemmaModel())
    # Optional: risk classifier as standalone if needed
    registry.register("risk_heuristic", RiskClassifier())
