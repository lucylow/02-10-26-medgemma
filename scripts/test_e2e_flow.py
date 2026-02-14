#!/usr/bin/env python3
"""
End-to-end integration test for Detailed Writer flow:
  screening → PHI redaction → draft generation → clinician edit → finalize → PDF

Usage:
  # Against live server (requires backend running on localhost:8000):
  python scripts/test_e2e_flow.py --live

  # As pytest (uses TestClient; requires MongoDB for persistence):
  python scripts/test_e2e_flow.py --pytest
  # Or: pytest backend/tests/test_e2e_flow.py -v

  # With custom base URL:
  python scripts/test_e2e_flow.py --live --base-url http://localhost:8000
"""
import argparse
import base64
import json
import os
import sys
from pathlib import Path

# Add backend to path for pytest / imports
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# Mock data
MOCK_SCREENING = {
    "screening_id": "screen-0001",
    "patient_id": "P-0001",
    "child_age_months": 24,
    "domain": "language",
    "observations": "John Doe DOB 2019-05-14 MRN: MRN-12345 Parent email: parent.jane@example.com Phone +1 (555) 123-4567. Parent reports: 'He only says ~10 single words and points rather than using phrases.' No regressions reported.",
    "scores": {"communication": 0.30, "motor": 0.85, "social": 0.90, "cognitive": 0.88},
}
MOCK_PATCH = {
    "clinical_summary": "Edited by clinician: I agree that communication should be monitored. Family advised for immediate speech-language referral and community resources listed.",
    "recommendations": [
        "Refer to speech-language pathologist for assessment",
        "Connect family to local early intervention services",
        "Start daily shared reading and language-stimulation activities",
        "Re-screen communication domain in 2 months",
    ],
}
API_KEY = os.environ.get("API_KEY", "dev-example-key")


def run_live(base_url: str) -> bool:
    """Run against live server using httpx."""
    try:
        import httpx
    except ImportError:
        print("Install httpx: pip install httpx")
        return False

    headers = {"x-api-key": API_KEY}
    report_id = None

    # 1) Generate draft
    print("1. POST /api/medgemma/generate-end2end ...")
    form = {
        "screening_id": MOCK_SCREENING["screening_id"],
        "age_months": str(MOCK_SCREENING["child_age_months"]),
        "scores_json": json.dumps(MOCK_SCREENING["scores"]),
        "observations": MOCK_SCREENING["observations"],
    }
    r = httpx.post(f"{base_url}/api/medgemma/generate-end2end", headers=headers, data=form, timeout=60)
    if r.status_code != 200:
        print(f"   FAIL: {r.status_code} {r.text[:500]}")
        return False
    draft = r.json()
    report_id = draft.get("report_id")
    assert report_id, "Missing report_id in response"
    assert draft.get("status") == "draft"
    assert "clinical_summary" in draft
    assert "recommendations" in draft
    print(f"   OK: report_id={report_id}")

    # 2) Patch draft
    print("2. POST /api/medgemma/reports/{id}/patch ...")
    r = httpx.post(
        f"{base_url}/api/medgemma/reports/{report_id}/patch",
        headers={**headers, "Content-Type": "application/json"},
        json=MOCK_PATCH,
        timeout=10,
    )
    if r.status_code != 200:
        print(f"   FAIL: {r.status_code} {r.text[:500]}")
        return False
    patched = r.json()
    assert patched.get("ok") is True
    assert patched.get("updated_draft", {}).get("clinical_summary") == MOCK_PATCH["clinical_summary"]
    print("   OK: patch applied")

    # 3) Finalize and get PDF
    print("3. POST /api/medgemma/reports/{id}/approve ...")
    r = httpx.post(
        f"{base_url}/api/medgemma/reports/{report_id}/approve",
        headers=headers,
        data={"clinician_note": "Reviewed and signed. SLP referral placed."},
        timeout=30,
    )
    if r.status_code != 200:
        print(f"   FAIL: {r.status_code} {r.text[:500]}")
        return False
    result = r.json()
    assert result.get("ok") is True
    assert result.get("final", {}).get("status") == "finalized"
    pdf_b64 = result.get("pdf_base64")
    assert pdf_b64, "Missing pdf_base64"

    # 4) Validate PDF decodes
    try:
        raw = base64.b64decode(pdf_b64)
        assert raw[:4] == b"%PDF", "Not a valid PDF"
        print(f"   OK: PDF decoded ({len(raw)} bytes)")
    except Exception as e:
        print(f"   FAIL: PDF decode error: {e}")
        return False

    print("\nAll checks passed.")
    return True


def run_pytest():
    """Run pytest on backend/tests/test_e2e_flow.py."""
    import subprocess
    test_file = ROOT / "backend" / "tests" / "test_e2e_flow.py"
    rc = subprocess.call([sys.executable, "-m", "pytest", str(test_file), "-v", "-s"])
    sys.exit(rc)


def main():
    parser = argparse.ArgumentParser(description="E2E flow test for MedGemma Detailed Writer")
    parser.add_argument("--live", action="store_true", help="Hit live server (localhost:8000)")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Base URL when --live")
    parser.add_argument("--pytest", action="store_true", help="Run as pytest (TestClient)")
    args = parser.parse_args()

    if args.pytest:
        run_pytest()
        return

    if args.live:
        ok = run_live(args.base_url)
        sys.exit(0 if ok else 1)

    if args.pytest:
        run_pytest()
        return

    # Default: run live
    print("Running against live server. Use --live or --pytest.")
    ok = run_live(args.base_url)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
