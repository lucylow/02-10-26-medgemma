"""
FHIR API helpers for use with a SMART access token.

Use when you already have an access_token (e.g. from /smart/callback or
exchange_code_for_token). For full write-back (DiagnosticReport, Observations,
DocumentReference) use backend/app/services/fhir_client.FHIRClient and
backend/app/api/epic_fhir endpoints.
"""
from __future__ import annotations

import os
from typing import Any, Dict

import requests

FHIR_BASE_URL = os.environ.get("EPIC_FHIR_SERVER_URL") or os.environ.get("FHIR_BASE_URL")
DEFAULT_TIMEOUT = 25


def get_patient(patient_id: str, token: str, fhir_base_url: str | None = None) -> Dict[str, Any]:
    """
    Fetch Patient resource from EHR (Epic/Cerner).
    """
    base = (fhir_base_url or FHIR_BASE_URL or "").rstrip("/")
    if not base:
        raise ValueError("FHIR_BASE_URL or EPIC_FHIR_SERVER_URL must be set")
    url = f"{base}/Patient/{patient_id}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/fhir+json",
    }
    r = requests.get(url, headers=headers, timeout=DEFAULT_TIMEOUT)
    r.raise_for_status()
    return r.json()


def push_observation(
    observation: Dict[str, Any],
    token: str,
    fhir_base_url: str | None = None,
) -> requests.Response:
    """
    POST an Observation to the FHIR server (e.g. AI screening result).
    Use fhir.adapter.observation_developmental_screening() to build the Observation
    with AI metadata (model, confidence, PSI drift).
    """
    base = (fhir_base_url or FHIR_BASE_URL or "").rstrip("/")
    if not base:
        raise ValueError("FHIR_BASE_URL or EPIC_FHIR_SERVER_URL must be set")
    url = f"{base}/Observation"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/fhir+json",
    }
    r = requests.post(url, headers=headers, json=observation, timeout=DEFAULT_TIMEOUT)
    r.raise_for_status()
    return r
