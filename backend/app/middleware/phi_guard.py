"""
HIPAA-Compliant PHI Guard Middleware.

Rule 1 — PHI Never Enters AI Pipeline:
Strict schema enforcement so no PHI fields reach AI inference or telemetry.
Only tokenized UUID may pass across services.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Set

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger("phi_guard")

# HIPAA-relevant identifiers; never allow in AI/telemetry payloads
PHI_FIELDS: Set[str] = {
    "name",
    "dob",
    "date_of_birth",
    "address",
    "phone",
    "guardian_name",
    "parent_name",
    "email",
    "ssn",
    "social_security",
    "mrn",
    "medical_record_number",
    "patient_id",  # raw external ID — use token only
    "patient_name",
    "guardian_phone",
    "guardian_email",
}


def _normalize_key(key: Any) -> str:
    if not isinstance(key, str):
        return ""
    return key.lower().strip()


def _check_dict(d: dict, path: str = "") -> list[str]:
    """Recursively find any key that matches PHI_FIELDS. Returns list of paths."""
    found: list[str] = []
    for k, v in d.items():
        nk = _normalize_key(k)
        current_path = f"{path}.{k}" if path else k
        if nk in PHI_FIELDS:
            found.append(current_path)
        if isinstance(v, dict):
            found.extend(_check_dict(v, current_path))
        if isinstance(v, list):
            for i, item in enumerate(v):
                if isinstance(item, dict):
                    found.extend(_check_dict(item, f"{current_path}[{i}]"))
    return found


def validate_no_phi(payload: dict) -> None:
    """
    Validate that no PHI field is present in the payload.
    Raises ValueError with the first offending key path if any PHI is detected.
    """
    violations = _check_dict(payload)
    if violations:
        raise ValueError(
            f"PHI field detected in AI payload: {violations[0]} (and possibly others). "
            "Use tokenized patient identity only."
        )


class PHIGuardMiddleware(BaseHTTPMiddleware):
    """
    Blocks requests to AI/telemetry routes if the body contains PHI keys.
    Apply only to routes that must never receive PHI (e.g. /api/infer, /api/analyze, /api/telemetry).
    """

    # Path prefixes that must never receive PHI
    PROTECTED_PREFIXES = (
        "/api/infer",
        "/api/analyze",
        "/api/stream-analyze",
        "/api/telemetry",
        "/api/embed",
    )

    async def dispatch(self, request: Request, call_next):
        if request.method != "POST" and request.method != "PUT":
            return await call_next(request)

        path = request.url.path
        if not any(path.startswith(p) for p in self.PROTECTED_PREFIXES):
            return await call_next(request)

        try:
            body = await request.body()
        except Exception as e:
            logger.warning("PHIGuard: could not read body: %s", e)
            return await call_next(request)

        if not body:
            return await call_next(request)

        try:
            payload = json.loads(body.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            # Non-JSON or binary; let route handle validation
            return await call_next(request)

        if not isinstance(payload, dict):
            return await call_next(request)

        try:
            validate_no_phi(payload)
        except ValueError as e:
            logger.warning("PHIGuard blocked request to %s: %s", path, e)
            return JSONResponse(
                status_code=400,
                content={
                    "error": "phi_not_allowed",
                    "message": "Request must not contain PHI. Use tokenized patient identity only.",
                    "detail": str(e),
                },
            )

        return await call_next(request)
