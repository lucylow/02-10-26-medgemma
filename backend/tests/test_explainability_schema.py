"""
Tests for explainability schema validation and evidence extraction.
Per design spec: AI Explainability & Trust — Page 16.
"""
import pytest
from pydantic import ValidationError

from app.models.explainability_schema import (
    EvidenceItem,
    InferenceExplainable,
    ModelProvenance,
)


class TestEvidenceItem:
    def test_valid_evidence_item(self):
        e = EvidenceItem(
            type="text",
            description="Parent reports limited vocabulary",
            reference_ids=[],
        )
        assert e.type == "text"
        assert e.description == "Parent reports limited vocabulary"

    def test_evidence_item_with_influence(self):
        e = EvidenceItem(
            type="nearest_neighbor",
            description="Similar case example-101",
            reference_ids=["example-101"],
            influence=0.85,
        )
        assert e.influence == 0.85

    def test_evidence_item_influence_bounds(self):
        with pytest.raises(ValidationError):
            EvidenceItem(type="text", description="x", influence=1.5)


class TestInferenceExplainable:
    def test_minimal_valid(self):
        x = InferenceExplainable(
            summary=["Child shows typical development."],
            risk="low",
            confidence=0.8,
            evidence=[],
            reasoning_chain=["Input reviewed.", "Risk assessed as low."],
            model_provenance={"model_id": "google/medgemma-2b-it"},
        )
        assert x.risk == "low"
        assert x.confidence == 0.8
        assert len(x.reasoning_chain) == 2

    def test_with_evidence(self):
        ev = EvidenceItem(type="text", description="Parent observation", reference_ids=[])
        x = InferenceExplainable(
            summary=["Summary point 1"],
            risk="monitor",
            confidence=0.6,
            evidence=[ev],
            reasoning_chain=["Step 1", "Step 2"],
            model_provenance={"adapter_id": "lora-v1", "model_id": "medgemma-2b"},
        )
        assert len(x.evidence) == 1
        assert x.evidence[0].type == "text"

    def test_confidence_bounds(self):
        with pytest.raises(ValidationError):
            InferenceExplainable(
                summary=[],
                risk="low",
                confidence=1.5,
                evidence=[],
                reasoning_chain=[],
                model_provenance={},
            )
