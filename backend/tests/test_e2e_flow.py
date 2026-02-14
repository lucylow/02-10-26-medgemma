"""
End-to-end integration tests for Detailed Writer flow:
  screening → PHI redaction → draft generation → clinician edit → finalize → PDF

Uses mock data from backend/tests/mock_data.json.
Requires: MongoDB (or Cloud SQL when INSTANCE_CONNECTION_NAME set) for persistence.

Run: pytest backend/tests/test_e2e_flow.py -v
"""
import base64
import json
import os
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

API_KEY = os.environ.get("API_KEY", "dev-example-key")

# Load mock data
_MOCK_PATH = Path(__file__).parent / "mock_data.json"
with open(_MOCK_PATH) as f:
    MOCK = json.load(f)

MOCK_SCREENING = MOCK["screening_row"]
MOCK_PATCH = MOCK["clinician_patch_request"]


@pytest.mark.asyncio
async def test_e2e_generate_patch_approve():
    """Full flow: generate draft → patch → approve → PDF."""
    headers = {"x-api-key": API_KEY}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        # 1) Generate draft
        form = {
            "screening_id": MOCK_SCREENING["screening_id"],
            "age_months": str(MOCK_SCREENING["child_age_months"]),
            "scores_json": json.dumps(MOCK_SCREENING["scores"]),
            "observations": MOCK_SCREENING["observations"],
        }
        r = await ac.post("/api/medgemma/generate-end2end", headers=headers, data=form, timeout=60)
        assert r.status_code == 200, r.text
        draft = r.json()
        report_id = draft.get("report_id")
        assert report_id, "Missing report_id"
        assert draft.get("status") == "draft"
        assert "clinical_summary" in draft
        assert "recommendations" in draft
        assert "domains" in draft

        # 2) Patch draft
        r = await ac.post(
            f"/api/medgemma/reports/{report_id}/patch",
            headers={**headers, "Content-Type": "application/json"},
            json=MOCK_PATCH,
            timeout=10,
        )
        assert r.status_code == 200, r.text
        patched = r.json()
        assert patched.get("ok") is True
        updated = patched.get("updated_draft", {})
        assert updated.get("clinical_summary") == MOCK_PATCH["clinical_summary"]
        assert "Connect family to local early intervention services" in updated.get("recommendations", [])

        # 3) Approve and get PDF
        r = await ac.post(
            f"/api/medgemma/reports/{report_id}/approve",
            headers=headers,
            data={"clinician_note": "Reviewed and signed. SLP referral placed."},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        result = r.json()
        assert result.get("ok") is True
        assert result.get("final", {}).get("status") == "finalized"
        assert "clinician_approval" in result.get("final", {})

        pdf_b64 = result.get("pdf_base64")
        assert pdf_b64, "Missing pdf_base64"
        raw = base64.b64decode(pdf_b64)
        assert raw[:4] == b"%PDF", "Response is not a valid PDF"


@pytest.mark.asyncio
async def test_patch_finalized_rejected():
    """Patch on finalized report should return 400."""
    headers = {"x-api-key": API_KEY}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        # Create and finalize a report first
        form = {
            "screening_id": "screen-patch-test",
            "age_months": "24",
            "scores_json": json.dumps({"communication": 0.5}),
            "observations": "Test observations",
        }
        r = await ac.post("/api/medgemma/generate-end2end", headers=headers, data=form, timeout=60)
        assert r.status_code == 200
        report_id = r.json().get("report_id")

        # Finalize
        await ac.post(
            f"/api/medgemma/reports/{report_id}/approve",
            headers=headers,
            data={"clinician_note": "Signed"},
            timeout=30,
        )

        # Patch should fail
        r = await ac.post(
            f"/api/medgemma/reports/{report_id}/patch",
            headers={**headers, "Content-Type": "application/json"},
            json={"clinical_summary": "Trying to edit finalized"},
            timeout=10,
        )
        assert r.status_code == 400
        assert "finalized" in r.json().get("detail", "").lower()
