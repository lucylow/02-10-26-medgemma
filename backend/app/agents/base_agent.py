"""
Base agent: model + tool registry abstraction for HAI pipelines.
All agents run model inference and optional MCP tools; decisions are logged with timestamps.
"""
import logging
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from app.models.interface import BaseModel
from app.mcp.tool_registry import MCPToolRegistry

logger = logging.getLogger(__name__)

# Safety: force manual review when confidence below this
CONFIDENCE_MANUAL_REVIEW_THRESHOLD = 0.6


class BaseAgent(ABC):
    """
    Abstract agent: owns a model and tool registry; run(input_data) returns enriched context.
    Subclasses define which tools run and in what order.
    """

    agent_id: str = "base_agent"
    """Tool chain this agent runs by default (subclasses may override)."""
    default_tool_chain: List[str] = []

    def __init__(
        self,
        model: BaseModel,
        tool_registry: MCPToolRegistry,
        tool_chain: Optional[List[str]] = None,
    ):
        self.model = model
        self.tool_registry = tool_registry
        self.tool_chain = tool_chain if tool_chain is not None else list(self.default_tool_chain)

    def validate_input(self, input_data: Dict[str, Any]) -> None:
        """Validate input_data; raise ValueError if invalid."""
        if not isinstance(input_data, dict):
            raise ValueError("input_data must be a dict")
        if not input_data.get("case_id"):
            raise ValueError("case_id is required")

    @abstractmethod
    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run agent pipeline: model inference + tools. Return full context with risk, confidence, etc.
        """
        raise NotImplementedError

    def _run_model(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Run base model inference. Override for custom pre/post."""
        return self.model.infer(input_data)

    def _run_tools(
        self,
        context: Dict[str, Any],
        use_fallback_on_failure: bool = True,
    ) -> Dict[str, Any]:
        """
        Run tool_chain; merge results into context. On tool failure, optionally apply
        conservative fallback (requires_clinician_review, risk escalation).
        """
        out = dict(context)
        out["_tool_chain"] = list(out.get("_tool_chain", []))
        tool_failed = False
        for tool_name in self.tool_chain:
            try:
                if tool_name not in self.tool_registry.list_tools():
                    continue
                result = self.tool_registry.run_with_fallback(tool_name, out) if use_fallback_on_failure else self.tool_registry.run(tool_name, out)
                if result is not None:
                    out["_tool_chain"].append(tool_name)
                    out.update(result)
            except Exception as e:
                logger.warning("Agent %s tool %s failed: %s", self.agent_id, tool_name, e)
                tool_failed = True
        if tool_failed and use_fallback_on_failure:
            out.setdefault("risk", "manual_review_required")
            out["requires_clinician_review"] = True
            out["review_reason"] = out.get("review_reason") or "Tool failure; conservative escalation"
        return out

    def _apply_safety_layer(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Apply safety rules: confidence < threshold -> force manual review.
        All decisions are intended to be logged with timestamp by caller (audit).
        """
        out = dict(context)
        try:
            conf = float(out.get("confidence", 0.5))
        except (TypeError, ValueError):
            conf = 0.5
        if conf < CONFIDENCE_MANUAL_REVIEW_THRESHOLD:
            out["requires_clinician_review"] = True
            out["review_reason"] = out.get("review_reason") or "Model confidence below threshold"
            if out.get("risk") != "manual_review_required":
                out["risk"] = "manual_review_required"
        return out

    def _decision_log_payload(
        self,
        context: Dict[str, Any],
        inference_time_ms: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Build a payload for audit: every decision with timestamp."""
        return {
            "timestamp": time.time(),
            "agent_id": self.agent_id,
            "case_id": context.get("case_id"),
            "risk": context.get("risk"),
            "confidence": context.get("confidence"),
            "tool_chain": context.get("tool_chain", context.get("_tool_chain", [])),
            "requires_clinician_review": context.get("requires_clinician_review"),
            "inference_time_ms": inference_time_ms,
        }
