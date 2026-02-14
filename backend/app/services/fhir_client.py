# backend/app/services/fhir_client.py
"""
SMART-on-FHIR client: post DiagnosticReport, Observations, and DocumentReference to a FHIR server.
Configure FHIR_BASE_URL and use OAuth2 (SMART on FHIR) for authentication.
"""
import base64
import json
import requests
from datetime import datetime
from typing import Dict, Any
from app.core.logger import logger

# Configure in env: FHIR_BASE_URL = "https://fhir.example.com"


class FHIRClient:
    """SMART-on-FHIR client for EHR integration."""

    def __init__(self, fhir_base_url: str, access_token: str):
        self.base_url = fhir_base_url.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/fhir+json",
        }

    def upload_document_reference(
        self,
        patient_id: str,
        pdf_bytes: bytes,
        title: str = "PediScreen AI Developmental Screening",
    ) -> Dict[str, Any]:
        """
        Create a DocumentReference attaching the PDF to the patient's EHR.
        Standards-based way to attach reports per SMART-on-FHIR.
        """
        encoded_pdf = base64.b64encode(pdf_bytes).decode("utf-8")
        payload = {
            "resourceType": "DocumentReference",
            "status": "current",
            "type": {"text": "Pediatric Screening Report"},
            "subject": {"reference": f"Patient/{patient_id}"},
            "content": [
                {
                    "attachment": {
                        "contentType": "application/pdf",
                        "data": encoded_pdf,
                        "title": title,
                    }
                }
            ],
        }
        res = requests.post(
            f"{self.base_url}/DocumentReference",
            headers=self.headers,
            json=payload,
            timeout=30,
        )
        res.raise_for_status()
        return res.json()


def post_to_fhir(
    draft_report: Dict[str, Any],
    auth_bearer_token: str,
    fhir_base_url: str,
) -> Dict[str, Any]:
    """
    Translates the draft report into FHIR resources and posts them.
    Returns the FHIR server responses; caller must manage error handling and mapping.
    """
    if not auth_bearer_token:
        raise ValueError("auth_bearer_token required for FHIR integration")
    headers = {
        "Authorization": f"Bearer {auth_bearer_token}",
        "Content-Type": "application/fhir+json",
    }

    # Convert Unix timestamp to ISO 8601 for FHIR
    effective_ts = draft_report.get("meta", {}).get("generated_at")
    effective_dt = (
        datetime.utcfromtimestamp(effective_ts).strftime("%Y-%m-%dT%H:%M:%SZ")
        if effective_ts
        else datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    )

    # 1) Create Observations for key evidence items (example)
    observation_refs = []
    for idx, evidence in enumerate(draft_report.get("key_evidence", [])):
        obs_resource = {
            "resourceType": "Observation",
            "status": "final",
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code": "survey",
                        }
                    ]
                }
            ],
            "code": {"text": "PediScreen - Evidence item"},
            "subject": {"identifier": {"value": draft_report["patient_info"]["patient_id"]}},
            "valueString": evidence,
            "effectiveDateTime": effective_dt,
        }
        try:
            resp = requests.post(
                f"{fhir_base_url}/Observation",
                headers=headers,
                data=json.dumps(obs_resource),
                timeout=30,
            )
            if resp.status_code in (200, 201):
                r = resp.json()
                observation_refs.append({"reference": f"Observation/{r.get('id')}"})
            else:
                logger.warning("Failed to post Observation: %s %s", resp.status_code, resp.text)
        except Exception as e:
            logger.warning("Observation post failed: %s", e)

    # 2) Create DiagnosticReport linking those observations
    diag = {
        "resourceType": "DiagnosticReport",
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/v2-0074",
                        "code": "PediScreen",
                    }
                ]
            }
        ],
        "code": {"text": "PediScreen Developmental Screening Report"},
        "subject": {"identifier": {"value": draft_report["patient_info"]["patient_id"]}},
        "effectiveDateTime": effective_dt,
        "conclusion": draft_report.get("clinical_summary", ""),
        "result": observation_refs,
    }
    try:
        resp = requests.post(
            f"{fhir_base_url}/DiagnosticReport",
            headers=headers,
            data=json.dumps(diag),
            timeout=30,
        )
        if resp.status_code in (200, 201):
            return {"ok": True, "diagnostic_report": resp.json()}
        else:
            logger.error("Failed to post DiagnosticReport: %s %s", resp.status_code, resp.text)
            return {"ok": False, "error": resp.text, "status_code": resp.status_code}
    except Exception as e:
        logger.exception("DiagnosticReport post failed: %s", e)
        return {"ok": False, "error": str(e), "status_code": 0}
