# backend/tests/test_medgemma_service.py
import pytest
from app.services.medgemma_service import MedGemmaService


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
