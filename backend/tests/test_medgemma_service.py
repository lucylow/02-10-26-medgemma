# backend/tests/test_medgemma_service.py
import base64

import numpy as np
import pytest
from app.services.medgemma_service import MedGemmaService


@pytest.mark.asyncio
async def test_infer_with_precomputed_embedding_invalid_shape_raises():
    """Invalid embedding shape -> raises ValueError (parse_embedding_b64 validation)."""
    svc = MedGemmaService({"ALLOW_PHI": False})
    # Wrong byte length for shape [1, 256]: provide 128 floats (512 bytes)
    arr = np.random.randn(128).astype(np.float32)
    b64 = base64.b64encode(arr.tobytes()).decode("ascii")
    with pytest.raises(ValueError) as exc_info:
        await svc.infer_with_precomputed_embedding(
            case_id="test-1",
            age_months=24,
            observations="test",
            embedding_b64=b64,
            shape=[1, 256],
        )
    assert "expected" in str(exc_info.value).lower() or "mismatch" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_medgemma_service_baseline():
    svc = MedGemmaService({"ALLOW_PHI": False})
    # simple non-PHI text
    res = await svc.analyze_input(24, "language", "Parent reports child says few words", None)
    assert "report" in res
    assert isinstance(res["report"], dict)
    assert "riskLevel" in res["report"]
    assert res["report"]["riskLevel"] in ["low", "monitor", "high"]
    assert "keyFindings" in res["report"]
    assert "recommendations" in res["report"]


@pytest.mark.asyncio
async def test_medgemma_service_phi_blocked():
    svc = MedGemmaService({"ALLOW_PHI": False})
    # text with PHI-like content (email)
    res = await svc.analyze_input(24, "language", "Contact parent@example.com for follow-up", None)
    assert "report" in res
    assert res.get("provenance", {}).get("note") == "phi_blocked"
    # Should still return a valid baseline report
    assert "riskLevel" in res["report"]
