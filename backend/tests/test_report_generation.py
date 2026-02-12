# backend/tests/test_report_generation.py
"""Unit tests for MedGemma Detailed Writer — schema conformance and model failure handling."""
import pytest

from app.models.report_schema import TechnicalReport
from app.services.detailed_writer import generate_technical_report


@pytest.mark.asyncio
async def test_generate_report_minimal():
    """Without model: deterministic baseline, valid TechnicalReport."""
    tr = await generate_technical_report(
        {"screening_id": "s1", "patient_id": "p1"},
        24,
        {"communication": 0.3},
        "few words",
        None,
        "auth-user",
        use_model=False,
    )
    assert isinstance(tr, TechnicalReport)
    assert tr.status == "draft"
    assert tr.clinical_summary
    assert tr.technical_summary
    assert tr.parent_summary
    assert tr.risk_assessment_overall in ("low", "medium", "high", "unknown")
    assert len(tr.domains) >= 4
    assert len(tr.evidence) >= 1
    assert len(tr.recommendations) >= 1
    assert tr.report_id.startswith("trpt-")


@pytest.mark.asyncio
async def test_generate_report_all_domains():
    """Domain assessments for communication, motor, social, cognitive."""
    tr = await generate_technical_report(
        {"screening_id": "s2"},
        36,
        {"communication": 0.2, "motor": 0.9, "social": 0.7, "cognitive": 0.5},
        "Observations here",
        None,
        None,
        use_model=False,
    )
    domain_names = {d.domain for d in tr.domains}
    assert "communication" in domain_names
    assert "motor" in domain_names
    assert "social" in domain_names
    assert "cognitive" in domain_names

    comm = next(d for d in tr.domains if d.domain == "communication")
    assert comm.rating == "concern"  # 0.2 < 0.5

    motor = next(d for d in tr.domains if d.domain == "motor")
    assert motor.rating == "typical"  # 0.9 >= 0.8


@pytest.mark.asyncio
async def test_generate_report_model_disabled_still_valid():
    """Model disabled or failure must still return valid schema."""
    tr = await generate_technical_report(
        {"screening_id": "s3"},
        12,
        {},
        "No scores",
        None,
        "batch",
        use_model=False,
    )
    assert isinstance(tr, TechnicalReport)
    assert tr.status == "draft"
    assert "clinical_summary" in tr.dict()
    assert "technical_summary" in tr.dict()
    assert "evidence" in tr.dict()
