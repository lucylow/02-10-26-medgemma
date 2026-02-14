"""
Page 3: Data quality endpoint.
GET /api/data-quality/:case_id returns structured health data quality report.
"""
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_api_key
from app.services.db import get_db
from app.services.db_cloudsql import (
    is_cloudsql_enabled,
    fetch_screening_by_id as cloudsql_fetch_screening,
)
from app.services.health_data_preprocessor import HealthDataPreprocessor

router = APIRouter(prefix="/api", tags=["Data Quality"])


def _screening_to_quality_payload(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert screening doc to format expected by preprocessor."""
    age = doc.get("child_age_months") or doc.get("childAge")
    return {
        "child_age_months": age,
        "childAge": age,
        "domain": doc.get("domain", ""),
        "observations": doc.get("observations", ""),
        "consent_id": doc.get("consent_id"),
        "consent_flag": doc.get("consent_flag", False),
        "image_path": doc.get("image_path"),
    }


@router.get("/data-quality/{case_id}", dependencies=[Depends(get_api_key)])
async def get_data_quality(case_id: str):
    """
    Return health data quality report for a case/screening.
    completeness_score, missing_fields, probability_of_noise, consent_present, etc.
    """
    preprocessor = HealthDataPreprocessor(require_consent_for_images=False)

    if is_cloudsql_enabled():
        doc = cloudsql_fetch_screening(case_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Case not found")
        doc = dict(doc)
        if "child_age_months" not in doc and "childAge" in doc:
            doc["child_age_months"] = doc["childAge"]
    else:
        db = get_db()
        doc = await db.screenings.find_one({"screening_id": case_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Case not found")
        doc = dict(doc)
        if "child_age_months" not in doc and "childAge" in doc:
            doc["child_age_months"] = doc["childAge"]

    payload = _screening_to_quality_payload(doc)
    has_image = bool(doc.get("image_path"))

    _, report = preprocessor.process_screening_input(payload, has_image=has_image)

    return {
        "case_id": case_id,
        "completeness_score": report.completeness_score,
        "missing_fields": report.missing_fields,
        "probability_of_noise": report.probability_of_noise,
        "consent_present": report.consent_present,
        "consent_id": report.consent_id,
        "validation_errors": report.validation_errors,
        "warnings": report.warnings,
    }


@router.post("/data-quality/validate", dependencies=[Depends(get_api_key)])
async def validate_data_quality(payload: Dict[str, Any]):
    """
    Validate a screening payload before submission.
    Returns quality report without persisting.
    """
    preprocessor = HealthDataPreprocessor(require_consent_for_images=True)
    has_image = bool(payload.get("image_path") or payload.get("image"))

    processed, report = preprocessor.process_screening_input(payload, has_image=has_image)

    return {
        "processed_payload": processed,
        "completeness_score": report.completeness_score,
        "missing_fields": report.missing_fields,
        "probability_of_noise": report.probability_of_noise,
        "consent_present": report.consent_present,
        "consent_id": report.consent_id,
        "validation_errors": report.validation_errors,
        "warnings": report.warnings,
        "valid": len(report.validation_errors) == 0,
    }
