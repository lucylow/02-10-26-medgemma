"""
Agent skill interface for MedGemma inference (model-dev).

Purpose: Clean, traceable calls from AI agents to embed and reasoner servers
with retries, timeouts, circuit breaker, and X-Trace-Id/client-id headers.
Inputs: embed_image(image_ref), infer_case(case_id, age_months, observations, embedding).
Outputs: embedding dict or result dict per inference contract.

Usage:
  from model_dev.agents.skills import EmbedSkill, ReasonerSkill
  skill = EmbedSkill(base_url="http://localhost:8000")
  emb = await skill.embed_image("case-1", image_ref="https://...")
  reasoner = ReasonerSkill(base_url="http://localhost:8000")
  result = await reasoner.infer_case("case-1", age_months=36, observations="...", embedding=emb)
"""
from __future__ import annotations

import base64
import logging
import uuid
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

# Optional circuit breaker (add pybreaker to deps if used)
try:
    import pybreaker
    CIRCUIT_BREAKER = pybreaker.CircuitBreaker(fail_max=5)
except ImportError:
    CIRCUIT_BREAKER = None


def _default_headers(trace_id: Optional[str] = None, client_id: Optional[str] = None) -> Dict[str, str]:
    h = {"Content-Type": "application/json"}
    if trace_id:
        h["X-Trace-Id"] = trace_id
    if client_id:
        h["client-id"] = client_id
    return h


class EmbedSkill:
    """Skill: embed image (or ref) → standardized embedding."""

    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        timeout_s: float = 30.0,
        max_retries: int = 2,
        client_id: Optional[str] = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout_s = timeout_s
        self.max_retries = max_retries
        self.client_id = client_id or "agent-embed"

    async def embed_image(
        self,
        case_id: str,
        image_b64: Optional[str] = None,
        image_ref: Optional[str] = None,
        shape_hint: Optional[List[int]] = None,
        trace_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Call POST /embed. Returns dict with embedding_b64, shape, emb_version.
        For agents that only have embedding (computed elsewhere), use ReasonerSkill.infer_case directly.
        """
        trace_id = trace_id or str(uuid.uuid4())
        body: Dict[str, Any] = {"case_id": case_id}
        if image_b64 is not None:
            body["image_b64"] = image_b64
        if image_ref is not None:
            body["image_ref"] = image_ref
        if shape_hint is not None:
            body["shape_hint"] = shape_hint
        last_err = None
        for attempt in range(self.max_retries + 1):
            try:
                # Optional: use sync circuit breaker elsewhere; async path uses retries only
                async with httpx.AsyncClient(timeout=self.timeout_s) as client:
                    r = await client.post(
                        f"{self.base_url}/embed",
                        json=body,
                        headers=_default_headers(trace_id=trace_id, client_id=self.client_id),
                    )
                    r.raise_for_status()
                    out = r.json()
                    logger.info("embed success case_id=%s trace_id=%s", case_id, trace_id)
                    return out
            except Exception as e:
                last_err = e
                logger.warning("embed attempt %s failed: %s", attempt + 1, e)
                if attempt == self.max_retries:
                    break
        raise last_err or RuntimeError("embed failed")


class ReasonerSkill:
    """Skill: infer case from embedding + metadata → summary, risk, recommendations, explainability."""

    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        timeout_s: float = 60.0,
        max_retries: int = 2,
        client_id: Optional[str] = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout_s = timeout_s
        self.max_retries = max_retries
        self.client_id = client_id or "agent-reasoner"

    async def infer_case(
        self,
        case_id: str,
        age_months: int,
        observations: str,
        embedding: Dict[str, Any],
        idempotency_key: Optional[str] = None,
        trace_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Call POST /infer. embedding can be the full response from EmbedSkill.embed_image
        (must contain embedding_b64) or a dict with key embedding_b64.
        Returns dict with text_summary, risk, recommendations, model_version, adapter_id, explainability.
        """
        trace_id = trace_id or str(uuid.uuid4())
        embedding_b64 = embedding.get("embedding_b64") if isinstance(embedding, dict) else None
        if not embedding_b64:
            raise ValueError("embedding must contain embedding_b64")
        body = {
            "case_id": case_id,
            "age_months": age_months,
            "observations": observations,
            "embedding_b64": embedding_b64,
        }
        if idempotency_key:
            body["idempotency_key"] = idempotency_key
        last_err = None
        for attempt in range(self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout_s) as client:
                    r = await client.post(
                        f"{self.base_url}/infer",
                        json=body,
                        headers=_default_headers(trace_id=trace_id, client_id=self.client_id),
                    )
                    r.raise_for_status()
                    out = r.json()
                    logger.info("infer success case_id=%s trace_id=%s", case_id, trace_id)
                    return out
            except Exception as e:
                last_err = e
                logger.warning("infer attempt %s failed: %s", attempt + 1, e)
                if attempt == self.max_retries:
                    break
        raise last_err or RuntimeError("infer failed")
