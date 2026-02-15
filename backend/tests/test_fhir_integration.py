"""
FHIR integration tests — run against HAPI FHIR sandbox when available.
Set FHIR_BASE_URL=http://localhost:8080/fhir and run HAPI FHIR in Docker to enable.
Skip when sandbox unavailable.
"""
import os
import pytest
import httpx

FHIR_BASE = os.environ.get("FHIR_BASE_URL", "http://localhost:8080/fhir")
API_BASE = os.environ.get("TEST_API_BASE", "http://localhost:8000")
API_KEY = os.environ.get("API_KEY", "dev-example-key")


def _fhir_available() -> bool:
    """Check if HAPI FHIR sandbox is reachable."""
    try:
        r = httpx.get(f"{FHIR_BASE.rstrip('/')}/metadata", timeout=5)
        return r.status_code == 200
    except Exception:
        return False


@pytest.fixture
def headers():
    return {"x-api-key": API_KEY}


@pytest.mark.skipif(not _fhir_available(), reason="FHIR sandbox not available (start HAPI FHIR)")
class TestFhirIntegration:
    """Integration tests against live FHIR server."""

    def test_fhir_conformance(self, headers):
        """Fetch CapabilityStatement from FHIR server."""
        r = httpx.get(f"{API_BASE}/api/fhir/conformance", headers=headers, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data.get("resourceType") == "CapabilityStatement"

    def test_export_bundle_returns_valid_structure(self, headers):
        """Export bundle returns valid FHIR Bundle (may 404 if no report)."""
        r = httpx.get(
            f"{API_BASE}/api/fhir/export_bundle/test-nonexistent",
            headers=headers,
            timeout=10,
        )
        if r.status_code == 404:
            pytest.skip("No test report in DB")
        assert r.status_code == 200
        bundle = r.json()
        assert bundle.get("resourceType") == "Bundle"
        assert bundle.get("type") == "transaction"
        assert "entry" in bundle


@pytest.mark.skipif(not _fhir_available(), reason="FHIR sandbox not available")
def test_push_bundle_to_hapi():
    """
    Push a minimal bundle to HAPI FHIR.
    Requires: Patient exists or bundle creates one; no auth for local HAPI.
    """
    # Build minimal bundle (Patient + Observation)
    bundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "identifier": [{"system": "http://test", "value": "test-push-1"}],
                },
                "request": {"method": "POST", "url": "Patient"},
            },
        ],
    }
    # HAPI without auth accepts POST
    r = httpx.post(
        FHIR_BASE.rstrip("/"),
        json=bundle,
        headers={"Content-Type": "application/fhir+json"},
        timeout=30,
    )
    assert r.status_code in (200, 201), r.text
