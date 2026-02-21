"""
Audit agent: runs model + full tool chain and attaches structured audit payload.
Use when every decision must be logged with timestamp for compliance.
"""
import logging
import time
from typing import Any, Dict, Optional

from app.models.interface import BaseModel
from app.models.post_processor import validate_and_sanitize, should_fallback, fallback_response
from app.mcp.tool_registry import MCPToolRegistry

from app.agents.base_agent import BaseAgent
from app.agents.screening_agent import ScreeningAgent

logger = logging.getLogger(__name__)


class AuditAgent(BaseAgent):
    """
    Audit agent: same pipeline as ScreeningAgent but always produces a decision_log
    and optional audit_tool payload for writing to audit log (caller persists).
    """

    agent_id = "audit_agent"
    default_tool_chain = ScreeningAgent.default_tool_chain

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        # Delegate to screening pipeline then enrich with audit payload
        screening = ScreeningAgent(self.model, self.tool_registry, self.tool_chain)
        context = screening.run(input_data)

        # Ensure audit payload for compliance: timestamp, tool_chain, confidence, risk
        context["audit_payload"] = {
            "timestamp": time.time(),
            "case_id": context.get("case_id"),
            "model_id": context.get("model_id"),
            "adapter_id": context.get("adapter_id"),
            "prompt_version": context.get("prompt_version"),
            "tool_chain": context.get("tool_chain", []),
            "confidence": context.get("confidence"),
            "risk": context.get("risk"),
            "requires_clinician_review": context.get("requires_clinician_review"),
            "clinician_override": context.get("clinician_override", False),
        }
        return context
