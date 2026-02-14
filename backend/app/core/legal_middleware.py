"""
Legal middleware — audit logging, PHI redaction enforcement, disclaimer headers,
and policy scan on AI-generated responses to block forbidden claim language.
"""
import json
import logging
import re
import time

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.services.legal_audit import write_audit_entry
from app.services.phi_redactor import redact_text
from app.services.policy_engine import scan_and_rewrite

logger = logging.getLogger("legal.middleware")

FORBIDDEN_PHRASES = [
    r"\bdiagnos(?:e|is|ing)\b",
    r"\bdefinitive diagnosis\b",
    r"\b100% certain\b",
    r"\bguarantee\b",
    r"\bshould not be seen by a clinician\b",
    r"\breplace the clinician\b",
]


class LegalMiddleware(BaseHTTPMiddleware):
    """
    - Logs request/response for audit
    - Ensures PHI redaction flag presence for model routes (logs when missing)
    - Adds disclaimer header for AI-generated content
    - Runs policy scan on outgoing AI text responses; blocks/rewrites forbidden phrases
    """

    async def dispatch(self, request: Request, call_next):
        start = time.time()
        body = await request.body()
        audit_payload = {
            "path": request.url.path,
            "method": request.method,
            "body_sample": (
                body.decode("utf-8", errors="ignore")[:2000] if body else None
            ),
        }

        # For model generation routes: check redaction flag (JSON body only)
        if request.url.path.startswith("/api/medgemma") or request.url.path.startswith(
            "/api/analyze"
        ):
            try:
                payload = json.loads(body.decode("utf-8") or "{}")
            except (json.JSONDecodeError, UnicodeDecodeError):
                payload = {}
            redaction_flag = payload.get("redaction_applied") or payload.get(
                "redacted_observations"
            ) is not None
            if not redaction_flag:
                observations = (
                    payload.get("observations")
                    or payload.get("textObservations")
                    or payload.get("text_observations")
                )
                if observations:
                    redaction = redact_text(
                        observations if isinstance(observations, str) else str(observations)
                    )
                    audit_payload["redaction_missing"] = True
                    audit_payload["auto_redaction_applied"] = redaction.get(
                        "redaction_count", 0
                    )
            # Note: Form-based endpoints (medgemma_detailed) are handled in route; redaction runs there

        try:
            response = await call_next(request)
        except Exception as e:
            logger.exception("Error in LegalMiddleware: %s", e)
            raise

        duration = time.time() - start

        # Audit the transaction
        try:
            await write_audit_entry(
                "request_trace",
                {
                    "path": request.url.path,
                    "method": request.method,
                    "duration_ms": int(duration * 1000),
                    "status_code": response.status_code,
                    "payload_snapshot": audit_payload,
                },
            )
        except Exception:
            logger.exception("Failed to write audit entry")

        # Disclaimer header for AI-generated content
        if request.url.path.startswith("/api/medgemma") or request.url.path.startswith(
            "/api/analyze"
        ) or request.url.path.startswith("/api/reports"):
            response.headers["X-PediScreen-Disclaimer"] = (
                "This output is AI-assisted clinical decision support. "
                "It is not a diagnosis. Clinician review required."
            )

        # Policy scan on JSON response body (only for successful responses)
        ct = response.headers.get("content-type", "")
        if "application/json" in ct and response.status_code < 400:
            content = b""
            try:
                async for chunk in response.body_iterator:
                    content += chunk
                j = json.loads(content.decode("utf-8"))
                to_scan = []
                for k in ("clinical_summary", "technical_summary", "parent_summary", "report", "text", "summary"):
                    if isinstance(j, dict) and k in j:
                        val = j[k]
                        if isinstance(val, str):
                            to_scan.append((k, val))
                        elif isinstance(val, dict) and "low" in val:
                            for v in val.values():
                                if isinstance(v, str):
                                    to_scan.append((k, v))
                blocked = False
                for key, text in to_scan:
                    rewritten, modified = scan_and_rewrite(text)
                    if modified:
                        if isinstance(j, dict) and key in j:
                            j[key] = (
                                "[REDACTED: Contains disallowed claim language. Clinician review required.]"
                                if any(
                                    re.search(p, text, re.I)
                                    for p in FORBIDDEN_PHRASES
                                )
                                else rewritten
                            )
                        blocked = True
                        await write_audit_entry(
                            "policy_block",
                            {
                                "field": key,
                                "path": request.url.path,
                                "value_sample": text[:200],
                            },
                        )
                if blocked:
                    new_body = json.dumps(j, default=str).encode("utf-8")
                    return Response(
                        content=new_body,
                        status_code=response.status_code,
                        media_type="application/json",
                        headers=dict(response.headers),
                    )
                # Return new Response with original content (body_iterator was consumed)
                return Response(
                    content=content,
                    status_code=response.status_code,
                    media_type="application/json",
                    headers=dict(response.headers),
                )
            except Exception:
                pass

        return response
