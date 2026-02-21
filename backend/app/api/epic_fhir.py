"""
Enterprise Hospital Deployment: Epic FHIR proxy and write-back.
- GET /api/fhir/patient/{patient_id}: fetch Patient from Epic (Bearer token).
- POST /api/fhir/report: write DiagnosticReport + Observations to Epic (AI report write-back).
- Hospital-grade structured logging (correlation ID, no PHI), timeouts, error handling.
"""
import time
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.config import settings
from app.core.hospital_logging import (
    get_correlation_id,
    log_epic_action,
    set_correlation_id,
)
from app.core.security import get_fhir_bearer_token
from app.services.fhir_bundle_builder import (
    build_risk_observation,
    create_bundle_for_case,
)

router = APIRouter(prefix="/api/fhir", tags=["Epic FHIR Proxy"])

# Timeouts for EHR calls (hospital networks can be slow)
FHIR_HTTP_TIMEOUT = 25.0


def _fhir_base_url() -> str:
    """Epic FHIR base URL: EPIC_FHIR_SERVER_URL or FHIR_BASE_URL."""
    url = settings.EPIC_FHIR_SERVER_URL or settings.FHIR_BASE_URL
    if not url:
        raise ValueError("EPIC_FHIR_SERVER_URL or FHIR_BASE_URL must be set for Epic proxy")
    return url.rstrip("/")


@router.get("/patient/{patient_id}")
async def get_patient(
    request: Request,
    patient_id: str,
    access_token: str = Depends(get_fhir_bearer_token),
):
    """
    Fetch Patient resource from Epic (or configured FHIR server).
    Requires Authorization: Bearer <SMART access_token>.
    Hospital-grade: correlation ID, no PHI in logs, timeout.
    """
    cid = request.headers.get("X-Request-ID") or request.headers.get("X-Correlation-ID")
    if cid:
        set_correlation_id(cid)
    start = time.perf_counter()
    try:
        base = _fhir_base_url()
        async with httpx.AsyncClient(timeout=FHIR_HTTP_TIMEOUT) as client:
            resp = await client.get(
                f"{base}/Patient/{patient_id}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/fhir+json",
                },
            )
        duration_ms = (time.perf_counter() - start) * 1000
        if resp.status_code == 404:
            log_epic_action(
                "fhir_patient_get",
                status="not_found",
                duration_ms=round(duration_ms, 2),
                patient_id_hash=hash(patient_id) % 10**6,
            )
            raise HTTPException(status_code=404, detail="Patient not found")
        resp.raise_for_status()
        data = resp.json()
        log_epic_action(
            "fhir_patient_get",
            status="ok",
            duration_ms=round(duration_ms, 2),
            patient_id_hash=hash(patient_id) % 10**6,
        )
        return data
    except httpx.HTTPStatusError as e:
        duration_ms = (time.perf_counter() - start) * 1000
        log_epic_action(
            "fhir_patient_get",
            status="error",
            duration_ms=round(duration_ms, 2),
            error_code=str(e.response.status_code),
            patient_id_hash=hash(patient_id) % 10**6,
        )
        raise HTTPException(
            status_code=e.response.status_code,
            detail="FHIR server error",
        )
    except Exception as e:
        duration_ms = (time.perf_counter() - start) * 1000
        log_epic_action(
            "fhir_patient_get",
            status="error",
            duration_ms=round(duration_ms, 2),
            error_code=type(e).__name__,
            patient_id_hash=hash(patient_id) % 10**6,
        )
        raise HTTPException(status_code=503, detail="FHIR request failed")


def _build_report_payload(
    patient_id: str,
    case_id: str,
    report: Dict[str, Any],
    practitioner_ref: Optional[str] = None,
    screening: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Build FHIR R4 DiagnosticReport + Observation payload for write-back.
    Uses fhir_bundle_builder for consistency with interoperability bundle.
    Returns a single DiagnosticReport with result references to Observations
    (Epic often accepts DiagnosticReport with inline or referenced Observations).
    """
    risk_assessment = report.get("risk_assessment") or {}
    risk_overall = risk_assessment.get("overall", "unknown")
    key_evidence = report.get("key_evidence", [])[:5]
    clinical_summary = report.get("clinical_summary", "") or report.get("conclusion", "")

    # Build risk Observation (we'll POST it first then reference in DiagnosticReport)
    obs_risk = build_risk_observation(
        patient_id=patient_id,
        risk_level=risk_overall,
        confidence=risk_assessment.get("confidence"),
        evidence=key_evidence if key_evidence else None,
    )
    # DiagnosticReport structure for Epic (R4)
    diag = {
        "resourceType": "DiagnosticReport",
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/v2-0074",
                        "code": "PediScreen",
                        "display": "PediScreen Developmental Screening",
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": "56962-1",
                    "display": "PediScreen AI Report",
                }
            ]
        },
        "subject": {"reference": f"Patient/{patient_id}"},
        "conclusion": clinical_summary[:4000] if clinical_summary else "PediScreen AI screening completed.",
        "meta": {
            "profile": ["http://pediscreen.ai/fhir/StructureDefinition/pediscreen-diagnostic-report"],
        },
    }
    # If we have a bundle we can POST transaction; for single report we return DiagnosticReport
    # and optionally a separate Observation POST. Caller can POST Observation first then add result refs.
    return {
        "diagnostic_report": diag,
        "observation_risk": obs_risk,
    }


@router.post("/report")
async def write_report(
    request: Request,
    report: Dict[str, Any],
    access_token: str = Depends(get_fhir_bearer_token),
):
    """
    Write AI report to Epic as FHIR DiagnosticReport + Observation(s).
    Body: { "patient_id", "case_id", "report": { "risk_assessment", "key_evidence", "clinical_summary" }, "practitioner_ref?", "screening?" }.
    Posts Observation first, then DiagnosticReport with result reference.
    Hospital-grade logging; no PHI in log payloads.
    """
    cid = request.headers.get("X-Request-ID") or request.headers.get("X-Correlation-ID")
    if cid:
        set_correlation_id(cid)
    patient_id = report.get("patient_id")
    case_id = report.get("case_id") or "unknown"
    if not patient_id:
        raise HTTPException(status_code=422, detail="patient_id required")
    start = time.perf_counter()
    base = _fhir_base_url()
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/fhir+json",
        "Accept": "application/fhir+json",
    }
    try:
        payload = _build_report_payload(
            patient_id=patient_id,
            case_id=case_id,
            report=report.get("report", report),
            practitioner_ref=report.get("practitioner_ref"),
            screening=report.get("screening"),
        )
        obs_risk = payload["observation_risk"]
        diag = payload["diagnostic_report"]
        observation_refs: List[Dict[str, str]] = []

        async with httpx.AsyncClient(timeout=FHIR_HTTP_TIMEOUT) as client:
            # 1) POST Observation (risk level)
            obs_resp = await client.post(
                f"{base}/Observation",
                headers=headers,
                json=obs_risk,
            )
            if obs_resp.status_code in (200, 201):
                obs_id = obs_resp.json().get("id")
                if obs_id:
                    observation_refs.append({"reference": f"Observation/{obs_id}"})
            # 2) DiagnosticReport with result references
            diag["result"] = observation_refs
            dr_resp = await client.post(
                f"{base}/DiagnosticReport",
                headers=headers,
                json=diag,
            )
            dr_resp.raise_for_status()

        duration_ms = (time.perf_counter() - start) * 1000
        log_epic_action(
            "fhir_report_write",
            status="ok",
            duration_ms=round(duration_ms, 2),
            patient_id_hash=hash(patient_id) % 10**6,
            case_id=case_id,
        )
        return {"ok": True, "diagnostic_report": dr_resp.json(), "observations_posted": len(observation_refs)}
    except httpx.HTTPStatusError as e:
        duration_ms = (time.perf_counter() - start) * 1000
        log_epic_action(
            "fhir_report_write",
            status="error",
            duration_ms=round(duration_ms, 2),
            error_code=str(e.response.status_code),
            patient_id_hash=hash(patient_id) % 10**6,
            case_id=case_id,
        )
        raise HTTPException(
            status_code=e.response.status_code,
            detail="FHIR write-back failed",
        )
    except Exception as e:
        duration_ms = (time.perf_counter() - start) * 1000
        log_epic_action(
            "fhir_report_write",
            status="error",
            duration_ms=round(duration_ms, 2),
            error_code=type(e).__name__,
            patient_id_hash=hash(patient_id) % 10**6,
            case_id=case_id,
        )
        raise HTTPException(status_code=503, detail="FHIR write-back failed")


@router.get("/epic/health")
async def epic_fhir_health():
    """Light health check: config present for Epic proxy (no FHIR call)."""
    base = _fhir_base_url() if (settings.EPIC_FHIR_SERVER_URL or settings.FHIR_BASE_URL) else None
    return {
        "epic_proxy_configured": bool(base),
        "correlation_id_sample": get_correlation_id(),
    }
