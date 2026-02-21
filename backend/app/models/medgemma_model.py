"""
MedGemma reasoning model wrapped in BaseModel interface.
Deterministic temperature, structured JSON output, prompt versioning, confidence calibration.
"""
import asyncio
import json
import logging
import re
from typing import Any, Dict, List, Optional

from app.models.interface import BaseModel

logger = logging.getLogger(__name__)

# Default prompt version for traceability
PROMPT_VERSION = "v2.1-clinical"


def _extract_json_from_markup(text: str) -> Optional[Dict[str, Any]]:
    """Extract JSON block between ===BEGIN_OUTPUT=== and ===END_OUTPUT=== or first {...}."""
    if not text:
        return None
    begin = "===BEGIN_OUTPUT==="
    end = "===END_OUTPUT==="
    if begin in text and end in text:
        start_i = text.index(begin) + len(begin)
        end_i = text.index(end)
        block = text[start_i:end_i].strip()
    else:
        match = re.search(r"\{[\s\S]*\}", text)
        block = match.group(0) if match else text
    try:
        return json.loads(block)
    except json.JSONDecodeError:
        # Try fixing common issues
        block = re.sub(r",\s*}", "}", block)
        block = re.sub(r",\s*]", "]", block)
        try:
            return json.loads(block)
        except json.JSONDecodeError:
            return None


def _validate_and_coerce(parsed: Dict[str, Any]) -> Dict[str, Any]:
    """Enforce schema: summary, risk, confidence, recommendations, reasoning_chain, evidence."""
    out: Dict[str, Any] = {}
    out["summary"] = parsed.get("summary")
    if not isinstance(out["summary"], list):
        out["summary"] = [str(parsed.get("summary", ""))] if parsed.get("summary") else []
    out["risk"] = str(parsed.get("risk", "monitor")).lower()
    if out["risk"] not in ("low", "monitor", "high", "refer"):
        out["risk"] = "monitor"
    conf = parsed.get("confidence")
    try:
        out["confidence"] = max(0.0, min(1.0, float(conf)))
    except (TypeError, ValueError):
        out["confidence"] = 0.5
    out["recommendations"] = parsed.get("recommendations")
    if not isinstance(out["recommendations"], list):
        out["recommendations"] = [str(parsed.get("recommendations", ""))] if parsed.get("recommendations") else []
    out["reasoning_chain"] = parsed.get("reasoning_chain")
    if not isinstance(out["reasoning_chain"], list):
        out["reasoning_chain"] = [str(parsed.get("reasoning_chain", ""))] if parsed.get("reasoning_chain") else []
    out["evidence"] = parsed.get("evidence")
    if not isinstance(out["evidence"], list):
        out["evidence"] = []
    out["parent_text"] = parsed.get("parent_text") or parsed.get("explain")
    return out


class MedGemmaModel(BaseModel):
    """
    MedGemma wrapped with BaseModel interface.
    Uses existing MedGemmaService when configured; otherwise falls back to mock.
    """

    def __init__(
        self,
        model_name: str = "medgemma-2b",
        temperature: float = 0.2,
        prompt_version: str = PROMPT_VERSION,
        service_factory: Optional[Any] = None,
    ):
        self.model_name = model_name
        self.temperature = temperature
        self.prompt_version = prompt_version
        self._service = None
        self._service_factory = service_factory
        self._loaded = False

    def _get_service(self):
        if self._service is not None:
            return self._service
        if self._service_factory:
            self._service = self._service_factory()
            return self._service
        # Lazy init from app config if available
        try:
            from app.core.config import settings
            if settings.HF_MODEL and settings.HF_API_KEY or (getattr(settings, "VERTEX_PROJECT", None) and getattr(settings, "VERTEX_LOCATION", None)):
                from app.services.medgemma_service import MedGemmaService
                self._service = MedGemmaService({
                    "HF_MODEL": settings.HF_MODEL,
                    "HF_API_KEY": getattr(settings, "HF_API_KEY", None),
                    "VERTEX_PROJECT": getattr(settings, "VERTEX_PROJECT", None),
                    "VERTEX_LOCATION": getattr(settings, "VERTEX_LOCATION", None),
                    "LORA_ADAPTER_PATH": getattr(settings, "LORA_ADAPTER_PATH", None),
                    "BASE_MODEL_ID": getattr(settings, "BASE_MODEL_ID", "google/medgemma-2b-it"),
                })
                return self._service
        except Exception as e:
            logger.warning("MedGemma service not configured: %s", e)
        return None

    def build_prompt(self, input_data: Dict[str, Any]) -> str:
        age = input_data.get("age_months")
        obs = input_data.get("observations", "")
        emb_note = "Precomputed embedding provided." if input_data.get("embedding_b64") else "No image embedding."
        return f"""[METADATA]
Child age (months): {age}
Context: {obs[:500]}

[IMAGE_EMBEDDING]
{emb_note}

Task: Provide a short clinical summary (2-4 bullets), risk level (low/monitor/high/refer), 3 recommendations, reasoning chain, and confidence (0-1). Return JSON only:
===BEGIN_OUTPUT===
{{"summary": ["..."], "risk": "monitor", "reasoning_chain": ["..."], "evidence": [], "confidence": 0.7, "recommendations": ["...", "...", "..."], "parent_text": "..."}}
===END_OUTPUT===

Observations:
{obs}"""

    def infer(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        svc = self._get_service()
        if svc is None:
            return self._fallback_output(input_data)
        try:
            # Existing service is async; run in loop
            raw = asyncio.run(self._call_service(svc, input_data))
            if raw is None:
                return self._fallback_output(input_data)
            report = raw.get("result", raw)
            if not isinstance(report, dict):
                return self._fallback_output(input_data)
            if report.get("risk") and report.get("summary") is not None:
                return self._to_structured(report, input_data)
            text = report.get("explain") or report.get("parent_text") or str(report)
            parsed = _extract_json_from_markup(text)
            if parsed:
                validated = _validate_and_coerce(parsed)
                return self._to_structured(validated, input_data)
            return self._fallback_output(input_data)
        except Exception as e:
            logger.exception("MedGemma infer failed: %s", e)
            return self._fallback_output(input_data, reason=str(e))

    async def _call_service(self, svc: Any, input_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return await svc.infer_with_precomputed_embedding(
            case_id=input_data.get("case_id", ""),
            age_months=input_data.get("age_months", 0),
            observations=input_data.get("observations", ""),
            embedding_b64=input_data.get("embedding_b64", ""),
            shape=input_data.get("shape", [1, 256]),
            emb_version=input_data.get("emb_version", "medsiglip-v1"),
        )

    def _to_structured(self, validated: Dict[str, Any], input_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "summary": validated.get("summary", []),
            "risk": validated.get("risk", "monitor"),
            "confidence": validated.get("confidence", 0.5),
            "recommendations": validated.get("recommendations", []),
            "reasoning_chain": validated.get("reasoning_chain", []),
            "evidence": validated.get("evidence", []),
            "parent_text": validated.get("parent_text"),
            "model_id": self.model_name,
            "prompt_version": self.prompt_version,
            "fallback": False,
        }

    def _fallback_output(self, input_data: Dict[str, Any], reason: str = "Model unavailable") -> Dict[str, Any]:
        return {
            "summary": ["Manual review recommended."],
            "risk": "manual_review_required",
            "confidence": 0.5,
            "recommendations": ["Complete clinical assessment.", "Review screening history."],
            "reasoning_chain": [reason],
            "evidence": [],
            "parent_text": None,
            "model_id": self.model_name,
            "prompt_version": self.prompt_version,
            "fallback": True,
            "reason": reason,
        }

    def health_check(self) -> bool:
        svc = self._get_service()
        return svc is not None

    def metadata(self) -> Dict[str, Any]:
        return {
            "model_id": self.model_name,
            "prompt_version": self.prompt_version,
            "temperature": self.temperature,
        }
