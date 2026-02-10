import os
import json
from datetime import datetime
from typing import Any, Dict

from .base import BaseAgent
from ..schemas.models import CasePayload, AgentResponse

AUDIT_DIR = os.path.join("infra")
AUDIT_LOG = os.path.join(AUDIT_DIR, "audit.log.jsonl")

class AuditAgent(BaseAgent):
    @property
    def name(self) -> str:
        return "AuditAgent"

    @property
    def role(self) -> str:
        return "Audit & Explanation Agent (Deterministic): Structured logging of inputs, decisions, and clinician edits for legal defensibility."

    def _ensure_dir(self):
        os.makedirs(AUDIT_DIR, exist_ok=True)

    async def process(self, payload: CasePayload) -> AgentResponse:
        self._ensure_dir()
        # Role: No LLM (structured logs only). Audits must be deterministic. Legal review friendly.
        entry: Dict[str, Any] = {
            "ts": datetime.utcnow().isoformat() + "Z",
            "case_id": payload.case_id,
            "client_version": payload.client_version,
            "age_months": payload.age_months,
            "consent_id": payload.consent_id,
            "status": payload.status,
            "metrics": payload.metrics,
            "features_keys": list(payload.features.keys()),
            "temporal": payload.temporal,
            "embeddings_count": len(payload.embeddings),
            "agent_decisions": [log["agent"] for log in payload.logs],
            "model_stack": {
                "vision": "medsiglip-base",
                "temporal": "faiss-heuristics",
                "reasoning": payload.medgemma_output.model_version if payload.medgemma_output else "n/a",
                "communication": "gemma-3-mock"
            }
        }
        if payload.medgemma_output:
            entry.update({
                "risk": payload.medgemma_output.risk,
                "confidence": payload.medgemma_output.confidence,
                "adapter_id": payload.medgemma_output.adapter_id,
                "model_version": payload.medgemma_output.model_version,
            })
        try:
            with open(AUDIT_LOG, "a", encoding="utf-8") as fh:
                fh.write(json.dumps(entry) + "\n")
        except Exception as e:
            return AgentResponse(success=False, error=f"Audit write failed: {e}")
        return AgentResponse(
            success=True, 
            data={"audit_path": AUDIT_LOG, "audit_trail_entry": entry}, 
            log_entry="Audit Agent: Deterministic structured log entry created for legal defensibility."
        )
