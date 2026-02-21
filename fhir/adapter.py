"""
FHIR Integration with Drift Tagging.

Attach AI metadata (model, confidence, PSI drift, drift_level) to FHIR Observations
for EHR interoperability and regulatory traceability.
"""
from __future__ import annotations

from typing import Any, Dict, Literal

# LOINC developmental screening
LOINC_DEVELOPMENTAL_SCREENING = "89243-0"
AI_METADATA_URL = "http://pediscreen.ai/fhir/StructureDefinition/ai-metadata"

DriftLevel = Literal["low", "moderate", "high", "critical"]


def attach_ai_metadata(
    observation: Dict[str, Any],
    model_name: str,
    confidence: float,
    psi_value: float,
    drift_level: str,
) -> Dict[str, Any]:
    """
    Attach AI metadata extension to a FHIR Observation.
    Embeds model, confidence, psi_drift, and drift_level for EHR and analytics.
    """
    observation = dict(observation)
    observation["extension"] = list(observation.get("extension", []))
    observation["extension"].append({
        "url": AI_METADATA_URL,
        "extension": [
            {"url": "model", "valueString": model_name},
            {"url": "confidence", "valueDecimal": round(confidence, 4)},
            {"url": "psi_drift", "valueDecimal": round(psi_value, 4)},
            {"url": "drift_level", "valueString": drift_level},
        ],
    })
    return observation


def observation_developmental_screening(
    subject_ref: str,
    value_string: str,
    model_name: str,
    confidence: float,
    psi_value: float,
    drift_level: DriftLevel | str = "low",
) -> Dict[str, Any]:
    """
    Build a FHIR Observation for developmental screening with AI metadata.
    Ready for POST to EHR (Epic, Cerner, etc.).
    """
    observation = {
        "resourceType": "Observation",
        "status": "final",
        "code": {
            "coding": [{
                "system": "http://loinc.org",
                "code": LOINC_DEVELOPMENTAL_SCREENING,
                "display": "Developmental screening",
            }],
        },
        "subject": {"reference": subject_ref},
        "valueString": value_string,
    }
    return attach_ai_metadata(
        observation,
        model_name=model_name,
        confidence=confidence,
        psi_value=psi_value,
        drift_level=drift_level,
    )


def get_ai_metadata_from_observation(observation: Dict[str, Any]) -> Dict[str, Any] | None:
    """Extract ai-metadata extension from an Observation if present."""
    for ext in observation.get("extension") or []:
        if ext.get("url") == AI_METADATA_URL:
            out = {}
            for sub in ext.get("extension") or []:
                url = sub.get("url")
                if "valueString" in sub:
                    out[url] = sub["valueString"]
                elif "valueDecimal" in sub:
                    out[url] = sub["valueDecimal"]
            return out
    return None
