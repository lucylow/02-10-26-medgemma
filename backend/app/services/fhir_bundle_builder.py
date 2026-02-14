"""
FHIR R4 Bundle builder for PediScreen AI — DocumentReference, QuestionnaireResponse,
Observation, Consent, Provenance. Conforms to interop/fhir_use_cases.md.
"""
import base64
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.core.logger import logger


def _ref(rt: str, rid: str) -> dict:
    return {"reference": f"{rt}/{rid}"}


def _coding(system: str, code: str, display: Optional[str] = None) -> dict:
    c = {"system": system, "code": code}
    if display:
        c["display"] = display
    return c


def build_document_reference(
    patient_id: str,
    pdf_bytes: bytes,
    title: str = "PediScreen AI Developmental Screening",
    practitioner_ref: Optional[str] = None,
) -> dict:
    """
    Build FHIR DocumentReference with PDF attachment.
    LOINC 56962-1 = PediScreen AI Report.
    """
    encoded = base64.b64encode(pdf_bytes).decode("utf-8")
    doc = {
        "resourceType": "DocumentReference",
        "status": "current",
        "type": {
            "coding": [_coding("http://loinc.org", "56962-1", "PediScreen AI Report")]
        },
        "subject": _ref("Patient", patient_id),
        "content": [
            {
                "attachment": {
                    "contentType": "application/pdf",
                    "data": encoded,
                    "title": title,
                }
            }
        ],
        "meta": {
            "lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        },
    }
    return doc


def build_questionnaire_response(
    patient_id: str,
    age_months: int,
    domain: str,
    observations: str,
    scores: Optional[Dict[str, Any]] = None,
    screening_id: Optional[str] = None,
) -> dict:
    """Build FHIR QuestionnaireResponse from screening inputs."""
    items = [
        {"linkId": "age", "text": "Age (months)", "answer": [{"valueInteger": age_months}]},
        {"linkId": "domain", "text": "Primary domain", "answer": [{"valueString": domain}]},
        {"linkId": "observations", "text": "Parent observations", "answer": [{"valueString": (observations or "")[:4000]}]},
    ]
    if scores:
        for k, v in scores.items():
            if v is not None:
                items.append({"linkId": f"score_{k}", "text": k, "answer": [{"valueDecimal": float(v)}]})
    if screening_id:
        items.append({"linkId": "screening_id", "text": "Screening ID", "answer": [{"valueString": screening_id}]})

    return {
        "resourceType": "QuestionnaireResponse",
        "status": "completed",
        "subject": _ref("Patient", patient_id),
        "item": items,
        "meta": {"lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")},
    }


def build_risk_observation(
    patient_id: str,
    risk_level: str,
    confidence: Optional[float] = None,
    evidence: Optional[List[str]] = None,
) -> dict:
    """
    Build FHIR Observation for risk level.
    category: assessment; valueCodeableConcept; optional confidence extension.
    """
    risk_code = (risk_level or "unknown").lower()
    if risk_code not in ("low", "medium", "high", "unknown"):
        risk_code = "unknown"

    obs = {
        "resourceType": "Observation",
        "status": "final",
        "category": [
            {"coding": [_coding("http://terminology.hl7.org/CodeSystem/observation-category", "assessment")]}
        ],
        "code": {"coding": [_coding("http://ai.pediscreen.org", "risk-level", "Risk Level")]},
        "subject": _ref("Patient", patient_id),
        "valueCodeableConcept": {"coding": [_coding("http://ai.pediscreen.org", risk_code, risk_code.capitalize())]},
        "meta": {"lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")},
    }
    if confidence is not None:
        obs.setdefault("extension", []).append({
            "url": "http://pediscreen.ai/fhir/StructureDefinition/confidence",
            "valueDecimal": round(confidence, 4),
        })
    if evidence:
        obs["note"] = [{"text": e[:500]} for e in evidence[:5]]
    return obs


def build_consent_resource(
    patient_id: str,
    scope: str = "patient-privacy",
    policy_authority: str = "http://example.org/consent-policy",
) -> dict:
    """Build FHIR Consent resource for EHR sharing."""
    return {
        "resourceType": "Consent",
        "status": "active",
        "scope": {"coding": [_coding("http://terminology.hl7.org/CodeSystem/consentscope", scope)]},
        "patient": _ref("Patient", patient_id),
        "policy": [{"authority": policy_authority}],
        "meta": {"lastUpdated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")},
    }


def build_provenance_resource(
    target_ref: str,
    practitioner_ref: str,
    activity: str = "author",
) -> dict:
    """Build FHIR Provenance for audit trail."""
    return {
        "resourceType": "Provenance",
        "target": [{"reference": target_ref}],
        "recorded": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "activity": {"coding": [_coding("http://terminology.hl7.org/CodeSystem/provenance-participant-type", activity)]},
        "agent": [{"who": {"reference": practitioner_ref}, "type": {"coding": [{"code": "author"}]}}],
    }


def create_bundle_for_case(
    case_id: str,
    patient_id: str,
    report: Dict[str, Any],
    pdf_bytes: Optional[bytes] = None,
    screening: Optional[Dict[str, Any]] = None,
    practitioner_ref: Optional[str] = None,
    include_consent: bool = False,
) -> dict:
    """
    Create a FHIR transaction Bundle for a screening case.
    Includes: DocumentReference (if PDF), QuestionnaireResponse, Observation(s), optional Consent.
    """
    entries: List[dict] = []
    effective_dt = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # 1. DocumentReference with PDF
    if pdf_bytes:
        doc_ref = build_document_reference(
            patient_id=patient_id,
            pdf_bytes=pdf_bytes,
            title="PediScreen AI Developmental Screening",
            practitioner_ref=practitioner_ref,
        )
        entries.append({
            "fullUrl": f"urn:uuid:doc-{case_id}",
            "resource": doc_ref,
            "request": {"method": "POST", "url": "DocumentReference"},
        })

    # 2. QuestionnaireResponse from screening
    if screening:
        age = screening.get("child_age_months") or screening.get("childAge") or 0
        domain = screening.get("domain", "communication")
        obs_text = screening.get("observations", "")
        scores = screening.get("report") or screening.get("scores") or {}
        if isinstance(scores, dict):
            norm = scores.get("normalized_scores") or {}
        else:
            norm = {}
        qr = build_questionnaire_response(
            patient_id=patient_id,
            age_months=int(age),
            domain=domain,
            observations=obs_text,
            scores=norm,
            screening_id=case_id,
        )
        entries.append({
            "fullUrl": f"urn:uuid:qr-{case_id}",
            "resource": qr,
            "request": {"method": "POST", "url": "QuestionnaireResponse"},
        })

    # 3. Risk Observation
    risk_assessment = report.get("risk_assessment") or {}
    risk_overall = risk_assessment.get("overall", "unknown")
    key_evidence = report.get("key_evidence", [])
    obs_risk = build_risk_observation(
        patient_id=patient_id,
        risk_level=risk_overall,
        confidence=None,  # Could extract from report if available
        evidence=key_evidence[:5],
    )
    entries.append({
        "fullUrl": f"urn:uuid:obs-risk-{case_id}",
        "resource": obs_risk,
        "request": {"method": "POST", "url": "Observation"},
    })

    # 4. Optional Consent
    if include_consent:
        consent = build_consent_resource(patient_id=patient_id)
        entries.append({
            "fullUrl": f"urn:uuid:consent-{case_id}",
            "resource": consent,
            "request": {"method": "POST", "url": "Consent"},
        })

    bundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "timestamp": effective_dt,
        "entry": entries,
    }
    return bundle
