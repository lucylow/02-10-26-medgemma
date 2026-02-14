#!/usr/bin/env python3
"""
Generate synthetic FHIR Patient and Observation resources for EHR sandbox testing.
Usage: python interop/scripts/generate_test_data.py
Output: JSON files in interop/scripts/fixtures/
"""
import json
import os
from datetime import datetime, timedelta

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
os.makedirs(FIXTURES_DIR, exist_ok=True)


def patient(patient_id: str = "test-patient-1", birth_date: str = "2022-02-14") -> dict:
    return {
        "resourceType": "Patient",
        "id": patient_id,
        "birthDate": birth_date,
        "gender": "unknown",
        "identifier": [{"system": "http://example.org/mrn", "value": f"MRN-{patient_id}"}],
    }


def observation(
    patient_id: str,
    risk_level: str = "medium",
    confidence: float = 0.85,
) -> dict:
    return {
        "resourceType": "Observation",
        "status": "final",
        "category": [
            {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "assessment"}]}
        ],
        "code": {"coding": [{"system": "http://ai.pediscreen.org", "code": "risk-level", "display": "Risk Level"}]},
        "subject": {"reference": f"Patient/{patient_id}"},
        "valueCodeableConcept": {"coding": [{"system": "http://ai.pediscreen.org", "code": risk_level}]},
        "extension": [{"url": "http://pediscreen.ai/fhir/StructureDefinition/confidence", "valueDecimal": confidence}],
        "effectiveDateTime": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


def main():
    pid = "test-patient-1"
    dob = (datetime.utcnow() - timedelta(days=730)).strftime("%Y-%m-%d")  # ~24 months ago

    p = patient(pid, dob)
    o = observation(pid, "medium", 0.88)

    with open(os.path.join(FIXTURES_DIR, "patient.json"), "w") as f:
        json.dump(p, f, indent=2)

    with open(os.path.join(FIXTURES_DIR, "observation.json"), "w") as f:
        json.dump(o, f, indent=2)

    bundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": [
            {"resource": p, "request": {"method": "POST", "url": "Patient"}},
            {"resource": o, "request": {"method": "POST", "url": "Observation"}},
        ],
    }
    with open(os.path.join(FIXTURES_DIR, "bundle_seed.json"), "w") as f:
        json.dump(bundle, f, indent=2)

    print(f"Generated fixtures in {FIXTURES_DIR}")
    print("  - patient.json")
    print("  - observation.json")
    print("  - bundle_seed.json")
    print("\nTo seed HAPI FHIR sandbox:")
    print("  curl -X POST http://localhost:8080/fhir -H 'Content-Type: application/fhir+json' -d @fixtures/bundle_seed.json")


if __name__ == "__main__":
    main()
