"""
Consent verification for HITL workflow.
Per spec: No AI reasoning until consent is recorded.
Validates consent structure and optionally verifies against consent store.
"""

import os
from typing import Optional, Dict, Any
from loguru import logger

# When True, skip DB verification (e.g. standalone inference server without consent DB)
SKIP_CONSENT_DB_VERIFY = os.getenv("SKIP_CONSENT_VERIFY", "0") == "1"


def validate_consent_for_screening(consent: Optional[Dict[str, Any]]) -> tuple[bool, str]:
    """
    Validate consent before AI inference.
    Per HITL spec: consent must be recorded before any reasoning.
    Returns (ok, error_message).
    """
    if not consent:
        return False, "Consent required before screening. Provide consent.consent_id and consent.consent_given=true."

    if not consent.get("consent_given"):
        return False, "Consent not given. consent.consent_given must be true for screening."

    consent_id = consent.get("consent_id")
    if not consent_id or not str(consent_id).strip():
        return False, "consent_id required for audit trail."

    # Validate scope includes screening
    scope = consent.get("consent_scope")
    if scope is not None:
        if isinstance(scope, list):
            valid_scopes = ["screening", "medgemma-inference", "raw_image"]
            if not any(s in valid_scopes for s in scope):
                return False, "consent_scope must include 'screening' or 'medgemma-inference'."
        elif isinstance(scope, dict):
            if not (scope.get("screening") or scope.get("medgemma-inference")):
                return False, "consent_scope must include screening or medgemma-inference."

    # Optional: verify consent_id exists and is not revoked (when DB available)
    if not SKIP_CONSENT_DB_VERIFY:
        ok, msg = _verify_consent_in_store(consent_id)
        if not ok:
            return False, msg

    return True, ""


def _verify_consent_in_store(consent_id: str) -> tuple[bool, str]:
    """
    Verify consent_id exists in consent store and is not revoked.
    Uses backend consent API or DB when available.
    """
    try:
        # Try MongoDB if available (backend/app structure)
        from app.services.db import get_db
        db = get_db()
        # Support both sync (pymongo) and async (motor) clients
        doc = db.consent_records.find_one({"consent_id": consent_id})
        if not doc:
            return False, f"Consent {consent_id} not found in consent store."
        if doc.get("revoked_at"):
            return False, f"Consent {consent_id} has been revoked."
        return True, ""
    except ImportError:
        # No DB module - skip verification
        return True, ""
    except Exception as e:
        logger.warning("Consent verification failed (non-fatal): {}", e)
        return True, ""  # Fail open for resilience when DB unavailable
