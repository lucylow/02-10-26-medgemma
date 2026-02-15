"""
Interoperability API — FHIR bundle export, EHR push, status, consent-gated export.
Per interop/ spec: export_bundle, push_to_ehr, ehr/status, consent before export.
"""
import time
import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from app.core.config import settings
from app.core.logger import logger
from app.core.security import get_api_key
from app.security.google_auth import require_clinician_or_api_key
from app.services.db import get_db
from app.services.db_cloudsql import is_cloudsql_enabled, fetch_screening_by_id as cloudsql_fetch_screening
from app.services.fhir_bundle_builder import create_bundle_for_case
from app.services.pdf_exporter import export_report_pdf
from app.services.hl7_screening import build_screening_oru
from app.services.legal_audit import write_audit_entry

router = APIRouter(prefix="/api", tags=["Interoperability"])


class PushBundleRequest(BaseModel):
    case_id: str
    fhir_base_url: str
    fhir_token: str
    consent_given: bool = True


async def _get_report_and_screening(case_id: str) -> tuple:
    """Fetch report and screening by case_id (report_id or screening_id)."""
    db = get_db()
    doc = await db.reports.find_one({"report_id": case_id})
    if not doc:
        doc = await db.reports.find_one({"screening_id": case_id}, sort=[("created_at", -1)])
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="report not found")

    report = doc.get("final_json") or doc.get("draft_json") or {}
    if isinstance(report, dict) and "draft_json" in report:
        report = report.get("draft_json", report)

    screening_id = doc.get("screening_id") or case_id
    if is_cloudsql_enabled():
        screening = cloudsql_fetch_screening(screening_id)
    else:
        screening = await db.screenings.find_one({"screening_id": screening_id})
    screening = screening or {}

    patient_id = (
        report.get("patient_info", {}).get("patient_id")
        or screening.get("patient_id")
        or screening_id
    )
    return report, screening, patient_id, doc


def _safe_push_to_ehr(bundle: dict, fhir_token: str, fhir_base_url: str, max_attempts: int = 3) -> dict:
    """
    Push FHIR bundle to EHR with exponential backoff retry.
    Per Page 16: retry logic with 2^attempt seconds between attempts.
    """
    headers = {
        "Authorization": f"Bearer {fhir_token}",
        "Content-Type": "application/fhir+json",
    }
    url = fhir_base_url.rstrip("/")
    for attempt in range(max_attempts):
        try:
            import requests
            r = requests.post(url, json=bundle, headers=headers, timeout=60)
            if r.ok:
                return {"ok": True, "status_code": r.status_code, "response": r.json() if r.text else {}}
            if attempt < max_attempts - 1:
                time.sleep(2 ** attempt)
        except Exception as e:
            logger.warning("EHR push attempt %s failed: %s", attempt + 1, e)
            if attempt < max_attempts - 1:
                time.sleep(2 ** attempt)
    logger.error("EHR push failed after %s attempts", max_attempts)
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="EHR push failed after retries",
    )


@router.get("/fhir/export_bundle/{case_id}")
async def export_fhir_bundle(
    case_id: str,
    include_consent: bool = Query(False, description="Include FHIR Consent in bundle"),
    api_key: str = Depends(get_api_key),
):
    """
    Export a FHIR Bundle for a case (report_id or screening_id).
    Returns DocumentReference, QuestionnaireResponse, Observation(s), optional Consent.
    """
    report, screening, patient_id, doc = await _get_report_and_screening(case_id)

    # Generate PDF for DocumentReference
    pdf_bytes = None
    try:
        clinician_name = doc.get("clinician_id", "PediScreen AI")
        pdf_bytes = export_report_pdf(report, clinician_name, "final")
    except Exception:
        pass
    if pdf_bytes is None:
        try:
            from app.services.pdf_renderer import generate_pdf_bytes
            pdf_bytes = generate_pdf_bytes(report)
        except Exception as e:
            logger.warning("PDF generation failed for bundle: %s", e)

    bundle = create_bundle_for_case(
        case_id=case_id,
        patient_id=patient_id,
        report=report,
        pdf_bytes=pdf_bytes,
        screening=screening,
        practitioner_ref=None,
        include_consent=include_consent,
    )
    return JSONResponse(content=bundle)


@router.get("/fhir/export/pdf/{case_id}")
async def export_pdf(
    case_id: str,
    api_key: str = Depends(get_api_key),
):
    """Export report as PDF (interop endpoint)."""
    report, _, _, doc = await _get_report_and_screening(case_id)
    clinician_name = doc.get("clinician_id", "PediScreen AI")
    version = "final" if doc.get("status") == "finalized" else "draft"
    try:
        pdf = export_report_pdf(report, clinician_name, version)
    except Exception:
        from app.services.pdf_renderer import generate_pdf_bytes
        pdf = generate_pdf_bytes(report)
    return Response(
        pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=pediscreen_report_{case_id}.pdf"},
    )


@router.get("/fhir/export/hl7v2/{case_id}")
async def export_hl7v2(
    case_id: str,
    api_key: str = Depends(get_api_key),
):
    """Export report as HL7 v2 ORU message."""
    report, screening, patient_id, _ = await _get_report_and_screening(case_id)
    screening_id = screening.get("screening_id") or case_id
    age = screening.get("child_age_months") or screening.get("childAge") or 0
    risk = (report.get("risk_assessment") or {}).get("overall", "unknown")
    summary = report.get("clinical_summary", "") or report.get("summary", "")
    domain = screening.get("domain", "communication")
    hl7 = build_screening_oru(
        screening_id=screening_id,
        patient_id=patient_id,
        age_months=int(age),
        risk_level=risk,
        summary=summary,
        domain=domain,
    )
    return Response(
        hl7,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=pediscreen_{case_id}.hl7"},
    )


@router.post("/fhir/push_bundle")
async def push_bundle_to_ehr(
    body: PushBundleRequest = Body(...),
    _auth: dict = Depends(require_clinician_or_api_key),
):
    """
    Push FHIR bundle to EHR. Requires consent_given=True.
    Uses retry logic with exponential backoff.
    """
    case_id, fhir_base_url, fhir_token, consent_given = (
        body.case_id, body.fhir_base_url, body.fhir_token, body.consent_given
    )
    if not consent_given:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Consent required before EHR export",
        )

    report, screening, patient_id, doc = await _get_report_and_screening(case_id)

    pdf_bytes = None
    try:
        from app.services.pdf_renderer import generate_pdf_bytes
        pdf_bytes = generate_pdf_bytes(report)
    except Exception as e:
        logger.warning("PDF generation failed: %s", e)

    bundle = create_bundle_for_case(
        case_id=case_id,
        patient_id=patient_id,
        report=report,
        pdf_bytes=pdf_bytes,
        screening=screening,
        include_consent=True,
    )

    export_id = str(uuid.uuid4())
    try:
        result = _safe_push_to_ehr(bundle, fhir_token, fhir_base_url)
        await write_audit_entry("ehr_export", {
            "event_type": "ehr_export",
            "export_id": export_id,
            "case_id": case_id,
            "patient_id": patient_id,
            "fhir_server": fhir_base_url,
            "outcome": "success",
            "actor": _auth.get("actor_id", "api"),
        })
        # Store export status for GET /ehr/status
        db = get_db()
        await db.ehr_exports.insert_one({
            "export_id": export_id,
            "case_id": case_id,
            "status": "success",
            "fhir_server": fhir_base_url,
            "created_at": time.time(),
        })
        return {"success": True, "export_id": export_id, "result": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("EHR push failed: %s", e)
        await write_audit_entry("ehr_export", {
            "event_type": "ehr_export",
            "export_id": export_id,
            "case_id": case_id,
            "outcome": "failure",
            "error": str(e),
            "actor": _auth.get("actor_id", "api"),
        })
        db = get_db()
        await db.ehr_exports.insert_one({
            "export_id": export_id,
            "case_id": case_id,
            "status": "failed",
            "error": str(e),
            "created_at": time.time(),
        })
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))


@router.get("/ehr/status/{export_id}")
async def ehr_export_status(
    export_id: str,
    api_key: str = Depends(get_api_key),
):
    """Return push status for an EHR export."""
    db = get_db()
    doc = await db.ehr_exports.find_one({"export_id": export_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="export not found")
    return {
        "export_id": export_id,
        "case_id": doc.get("case_id"),
        "status": doc.get("status", "unknown"),
        "fhir_server": doc.get("fhir_server"),
        "error": doc.get("error"),
        "created_at": doc.get("created_at"),
    }


@router.get("/fhir/conformance")
async def fhir_conformance(
    api_key: str = Depends(get_api_key),
):
    """Test FHIR server connection — fetch CapabilityStatement (metadata)."""
    base = settings.FHIR_BASE_URL
    if not base:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="FHIR_BASE_URL not configured",
        )
    try:
        import requests
        url = f"{base.rstrip('/')}/metadata"
        r = requests.get(url, headers={"Accept": "application/fhir+json"}, timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.warning("FHIR conformance fetch failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        )
