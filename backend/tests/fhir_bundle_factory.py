"""
Synthetic FHIR Bundle generator for Epic Production Pilot test harness.
Produces valid FHIR R4 resources for E2E and integration tests (no PHI).
Uses fhir.resources when available; falls back to plain dicts for compatibility.
"""
from typing import Any, Dict, List, Optional

try:
    from fhir.resources.R4b.bundle import Bundle, BundleEntry
    from fhir.resources.R4b.patient import Patient
    from fhir.resources.R4b.humanname import HumanName
    _FHIR_AVAILABLE = True
except ImportError:
    try:
        from fhir.resources.bundle import Bundle, BundleEntry
        from fhir.resources.patient import Patient
        from fhir.resources.humanname import HumanName
        _FHIR_AVAILABLE = True
    except ImportError:
        _FHIR_AVAILABLE = False


def _serialize(resource: Any) -> dict:
    """Serialize FHIR resource to dict (Pydantic v1/v2 compatible)."""
    if hasattr(resource, "model_dump"):
        return resource.model_dump(exclude_none=True)
    if hasattr(resource, "dict"):
        return resource.dict(exclude_none=True)
    return dict(resource)


def generate_test_patient(
    patient_id: str,
    gender: str = "male",
    birth_date: str = "2023-01-01",
    name: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """Build a synthetic FHIR Patient for testing (pediatric cohort). Returns dict."""
    patient_data: Dict[str, Any] = {
        "resourceType": "Patient",
        "id": patient_id,
        "gender": gender,
        "birthDate": birth_date,
    }
    if name:
        patient_data["name"] = [{"family": name.get("family", "Test"), "given": name.get("given", ["Child"])}]
    if _FHIR_AVAILABLE:
        return _serialize(Patient(**patient_data))
    return patient_data


def generate_test_patient_bundle(
    patient_id: str,
    gender: str = "male",
    birth_date: str = "2023-01-01",
    name: Optional[Dict[str, str]] = None,
) -> dict:
    """
    Build a FHIR Bundle (collection) containing a single Patient.
    Returns bundle as dict for API/validation tests.
    """
    patient = generate_test_patient(
        patient_id=patient_id,
        gender=gender,
        birth_date=birth_date,
        name=name,
    )
    if _FHIR_AVAILABLE:
        entry = BundleEntry(resource=patient)
        bundle = Bundle(type="collection", entry=[entry])
        return _serialize(bundle)
    return {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [{"resource": patient}],
    }


def generate_test_observation(
    patient_id: str,
    observation_id: str,
    value_code: str = "low",
    value_display: str = "Low risk",
) -> dict:
    """Build a synthetic Observation (e.g. risk level) for write-back tests."""
    obs_data = {
        "resourceType": "Observation",
        "id": observation_id,
        "status": "final",
        "subject": {"reference": f"Patient/{patient_id}"},
        "code": {
            "coding": [
                {
                    "system": "http://ai.pediscreen.org",
                    "code": "risk-level",
                    "display": "Risk Level",
                }
            ]
        },
        "valueCodeableConcept": {
            "coding": [
                {
                    "system": "http://ai.pediscreen.org",
                    "code": value_code,
                    "display": value_display,
                }
            ]
        },
    }
    return obs_data


def generate_test_diagnostic_report_bundle(
    patient_id: str,
    report_id: str,
    result_refs: Optional[List[str]] = None,
) -> dict:
    """Build a minimal DiagnosticReport bundle for write-back validation."""
    result_refs = result_refs or []
    report_data = {
        "resourceType": "DiagnosticReport",
        "id": report_id,
        "status": "final",
        "subject": {"reference": f"Patient/{patient_id}"},
        "code": {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": "56962-1",
                    "display": "PediScreen AI Developmental Screening",
                }
            ]
        },
        "result": [{"reference": ref} for ref in result_refs],
    }
    entry = BundleEntry(resource=report_data)
    bundle = Bundle(type="collection", entry=[entry])
    return _serialize(bundle)


def generate_test_pediatric_cohort_bundle(
    patient_ids: Optional[List[str]] = None,
    count: int = 5,
) -> dict:
    """
    Generate a collection Bundle of multiple test patients (synthetic cohort).
    Useful for batch and IRB-style cohort tests.
    """
    patient_ids = patient_ids or [f"test-ped-{i}" for i in range(count)]
    entries = []
    for i, pid in enumerate(patient_ids):
        gender = "male" if i % 2 == 0 else "female"
        birth_date = f"202{min(3, i % 4)}-{(i % 12) + 1:02d}-01"
        patient = generate_test_patient(
            patient_id=pid,
            gender=gender,
            birth_date=birth_date,
        )
        entries.append(BundleEntry(resource=_serialize(patient)))
    bundle = Bundle(type="collection", entry=entries)
    return _serialize(bundle)
