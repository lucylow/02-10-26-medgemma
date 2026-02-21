"""Tests for synthetic FHIR bundle factory (Epic Production Pilot harness)."""
import pytest

from tests.fhir_bundle_factory import (
    generate_test_patient,
    generate_test_patient_bundle,
    generate_test_observation,
    generate_test_diagnostic_report_bundle,
    generate_test_pediatric_cohort_bundle,
)


def test_generate_test_patient():
    patient = generate_test_patient("ped-001", gender="female", birth_date="2022-06-15")
    assert patient["resourceType"] == "Patient"
    assert patient["id"] == "ped-001"
    assert patient["gender"] == "female"
    assert patient["birthDate"] == "2022-06-15"


def test_generate_test_patient_bundle():
    bundle = generate_test_patient_bundle("ped-002", birth_date="2023-01-01")
    assert bundle["resourceType"] == "Bundle"
    assert bundle["type"] == "collection"
    assert len(bundle["entry"]) == 1
    assert bundle["entry"][0]["resource"]["resourceType"] == "Patient"
    assert bundle["entry"][0]["resource"]["id"] == "ped-002"


def test_generate_test_observation():
    obs = generate_test_observation("ped-003", "obs-1", value_code="high", value_display="High risk")
    assert obs["resourceType"] == "Observation"
    assert obs["subject"]["reference"] == "Patient/ped-003"
    assert obs["valueCodeableConcept"]["coding"][0]["code"] == "high"


def test_generate_test_diagnostic_report_bundle():
    bundle = generate_test_diagnostic_report_bundle(
        "ped-004", "dr-1", result_refs=["Observation/obs-1"]
    )
    assert bundle["resourceType"] == "Bundle"
    report = bundle["entry"][0]["resource"]
    assert report["resourceType"] == "DiagnosticReport"
    assert report["code"]["coding"][0]["code"] == "56962-1"
    assert len(report["result"]) == 1


def test_generate_test_pediatric_cohort_bundle():
    bundle = generate_test_pediatric_cohort_bundle(count=3)
    assert bundle["resourceType"] == "Bundle"
    assert len(bundle["entry"]) == 3
    ids = {e["resource"]["id"] for e in bundle["entry"]}
    assert ids == {"test-ped-0", "test-ped-1", "test-ped-2"}
