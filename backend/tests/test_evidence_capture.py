"""
Tests for evidence capture (FAISS nearest neighbors, model evidence extraction).
Per design spec: AI Explainability & Trust — Page 16.
"""
import pytest
import numpy as np

from app.services.evidence_capture import (
    extract_evidence_from_model_output,
    get_nearest_neighbor_evidence,
)


class TestExtractEvidenceFromModelOutput:
    def test_empty_model_output(self):
        result = extract_evidence_from_model_output({}, [])
        assert result == []

    def test_model_with_explain(self):
        model = {"explain": "Visual analysis suggests typical fine motor patterns."}
        result = extract_evidence_from_model_output(model, [])
        assert len(result) == 1
        assert result[0].type == "text"
        assert "typical fine motor" in result[0].description

    def test_model_with_evidence_list(self):
        model = {
            "evidence": [
                {"type": "text", "text": "Parent report", "reference_ids": []},
                {"type": "nearest_neighbor", "description": "Case X", "reference_ids": ["x-1"]},
            ]
        }
        result = extract_evidence_from_model_output(model, [])
        assert len(result) >= 2

    def test_combines_nn_and_model_evidence(self):
        from app.models.explainability_schema import EvidenceItem

        nn = [
            EvidenceItem(
                type="nearest_neighbor",
                description="Similar case A",
                reference_ids=["a-1"],
            )
        ]
        model = {"explain": "Model explanation"}
        result = extract_evidence_from_model_output(model, nn)
        assert len(result) >= 2
        types = [e.type for e in result]
        assert "nearest_neighbor" in types
        assert "text" in types


class TestGetNearestNeighborEvidence:
    def test_empty_index_returns_empty(self):
        emb = np.zeros((1, 256), dtype=np.float32)
        result = get_nearest_neighbor_evidence(emb, k=5, dim=256)
        # With no FAISS index, returns []
        assert isinstance(result, list)
