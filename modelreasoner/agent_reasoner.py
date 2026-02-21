# modelreasoner/agent_reasoner.py — Reasoner agent: calls model server with standard envelope
"""
ReasonerAgent: HTTP client that calls the MedGemma model server.
Accepts the standard request envelope; maps to /infer_embedding or /infer_text
if the server does not expose /call. Returns the standard agent response envelope.
"""
import time
from datetime import datetime, timezone
from typing import Any, Dict

import requests

# Optional: use orchestrator agent_base when running from repo root with PYTHONPATH
try:
    from orchestrator.agent_base import HTTPAgent
except ImportError:
    HTTPAgent = None  # type: ignore


class ReasonerAgent:
    """
    Wraps the model server (MedGemma) for clinical reasoning.
    Uses HTTPAgent when available; otherwise implements handle/health locally.
    """

    def __init__(self, agent_id: str, url: str, timeout: int = 30):
        self.agent_id = agent_id
        self.url = url.rstrip("/")
        self.timeout = timeout
        self._http = HTTPAgent(agent_id, url, timeout=timeout) if HTTPAgent else None

    def health(self) -> Dict[str, Any]:
        if self._http:
            return self._http.health()
        try:
            r = requests.get(f"{self.url}/health", timeout=2)
            return {"status": "ok" if r.ok else "error", "meta": r.json() if r.ok else {}}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _infer_payload_from_envelope(self, envelope: Dict[str, Any]) -> Dict[str, Any]:
        """Build model server infer payload from standard request envelope."""
        payload = envelope.get("payload") or {}
        return {
            "case_id": envelope.get("case_id") or payload.get("case_id"),
            "age_months": payload.get("age_months"),
            "observations": payload.get("observations"),
            "embedding_b64": payload.get("embedding_b64"),
            "shape": payload.get("shape", [1, 256]),
            "max_new_tokens": payload.get("max_new_tokens", 256),
            "temperature": payload.get("temperature", 0.0),
        }

    def _wrap_response(
        self,
        request_id: str,
        raw: Dict[str, Any],
        duration_ms: int,
        model_version: str = "",
        adapter_id: str = "",
    ) -> Dict[str, Any]:
        """Wrap model server response into standard agent response envelope."""
        result = raw.get("result") if "result" in raw else raw
        if isinstance(result, dict):
            confidence = float(result.get("confidence", 0.0))
            evidence = result.get("evidence") or []
        else:
            confidence = 0.0
            evidence = []
        return {
            "request_id": request_id,
            "agent_id": self.agent_id,
            "model_version": model_version or raw.get("model_version", ""),
            "adapter_id": adapter_id or raw.get("adapter_id", ""),
            "response_ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "duration_ms": duration_ms,
            "result": result if isinstance(result, dict) else {"text": result},
            "confidence": confidence,
            "evidence": evidence if isinstance(evidence, list) else [],
            "logs": {"warnings": [], "notes": []},
        }

    def call_reasoner(self, envelope: Dict[str, Any]) -> Dict[str, Any]:
        """
        Call the reasoner (model server) with the request envelope.
        Returns the standard agent response envelope.
        """
        return self.handle(envelope)

    def handle(self, request_envelope: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process request: try /call first; else map to /infer_embedding or /infer_text
        and wrap response in standard envelope.
        """
        request_id = request_envelope.get("request_id", "")
        # If server implements /call, use HTTPAgent
        if self._http:
            try:
                r = requests.post(
                    f"{self.url}/call",
                    json=request_envelope,
                    timeout=self.timeout,
                )
                if r.status_code == 200:
                    return r.json()
            except requests.exceptions.RequestException:
                pass
        # Map to existing model server API
        body = self._infer_payload_from_envelope(request_envelope)
        has_embedding = body.get("embedding_b64")
        endpoint = f"{self.url}/infer_embedding" if has_embedding else f"{self.url}/infer_text"
        if not has_embedding:
            body.pop("embedding_b64", None)
            body.pop("shape", None)
        start = time.perf_counter()
        r = requests.post(endpoint, json=body, timeout=self.timeout)
        r.raise_for_status()
        duration_ms = int((time.perf_counter() - start) * 1000)
        raw = r.json()
        return self._wrap_response(
            request_id,
            raw,
            duration_ms,
            raw.get("model_version", ""),
            raw.get("adapter_id", ""),
        )
