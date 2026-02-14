"""
FHIR Provenance resource builder for FDA-grade audit trails.
Proves who did what, when, and why for regulatory compliance.
Includes AI inference provenance per PediScreen design spec (Section 3.3).
"""
from datetime import datetime
from typing import Optional, Dict, Any


def build_provenance(
    target_ref: str,
    practitioner_ref: str,
    activity: str = "author",
    recorded: Optional[str] = None,
) -> dict:
    """
    Build a FHIR R4 Provenance resource for audit trail.

    Args:
        target_ref: Reference to the target resource (e.g. "DocumentReference/123")
        practitioner_ref: Reference to the clinician (e.g. "Practitioner/456" or "PractitionerRole/789")
        activity: Provenance activity (author, reviewer, etc.)
        recorded: ISO timestamp; defaults to now

    Returns:
        FHIR Provenance resource dict
    """
    return {
        "resourceType": "Provenance",
        "target": [{"reference": target_ref}],
        "recorded": recorded or datetime.utcnow().isoformat() + "Z",
        "activity": {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
                    "code": activity,
                }
            ]
        },
        "agent": [
            {
                "who": {"reference": practitioner_ref},
                "type": {
                    "coding": [{"code": "author"}]
                },
            }
        ],
    }


def build_provenance_for_document(
    document_reference_id: str,
    practitioner_ref: str,
    activity: str = "author",
) -> dict:
    """
    Convenience: build Provenance for a DocumentReference.
    """
    return build_provenance(
        target_ref=f"DocumentReference/{document_reference_id}",
        practitioner_ref=practitioner_ref,
        activity=activity,
    )


def build_ai_inference_provenance(
    target_ref: str,
    practitioner_ref: str,
    inference_meta: Dict[str, Any],
    activity: str = "authored",
) -> dict:
    """
    Build FHIR Provenance for AI-assisted content (design spec Section 3.3).
    Captures base_model_id, adapter_id, input_hash, inference_time_ms for audit.
    """
    recorded = datetime.utcnow().isoformat() + "Z"
    entity = []
    if inference_meta.get("base_model_id"):
        entity.append({
            "role": "derivation",
            "what": {
                "identifier": {
                    "system": "https://huggingface.co",
                    "value": inference_meta["base_model_id"],
                }
            },
        })
    if inference_meta.get("adapter_id"):
        entity.append({
            "role": "derivation",
            "what": {
                "identifier": {
                    "system": "urn:pediscreen:adapter",
                    "value": inference_meta["adapter_id"],
                }
            },
        })
    prov = build_provenance(
        target_ref=target_ref,
        practitioner_ref=practitioner_ref,
        activity=activity,
        recorded=recorded,
    )
    prov["entity"] = entity
    prov["extension"] = [
        {
            "url": "http://pediscreen.ai/fhir/StructureDefinition/ai-inference-meta",
            "valueString": str(inference_meta),
        }
    ]
    return prov
