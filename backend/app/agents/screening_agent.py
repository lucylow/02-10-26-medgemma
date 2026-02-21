"""
Screening agent: full screening pipeline — model + milestone, risk, confidence, guideline, audit.
Used for primary developmental screening; applies safety layer and decision logging.
"""
import logging
import time
from typing import Any, Dict, List

from app.models.interface import BaseModel
from app.models.post_processor import validate_and_sanitize, should_fallback, fallback_response
from app.mcp.tool_registry import MCPToolRegistry

from app.agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)

DEFAULT_SCREENING_TOOL_CHAIN = [
    "milestone_tool",
    "risk_tool",
    "confidence_tool",
    "guideline_tool",
    "audit_tool",
]


class ScreeningAgent(BaseAgent):
    """
    Full screening agent: model inference -> milestone, risk, confidence, guideline, audit.
    Applies validate_and_sanitize and fallback on low confidence; enforces safety layer.
    """

    agent_id = "screening_agent"
    default_tool_chain = DEFAULT_SCREENING_TOOL_CHAIN

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_input(input_data)
        start = time.perf_counter()

        # 1) Model inference
        model_output = self._run_model(input_data)
        context = {**input_data, **model_output}
        context["_tool_chain"] = []

        # 2) Tools with fallback on failure
        context = self._run_tools(context, use_fallback_on_failure=True)

        # 3) Post-process: fallback response if needed, then validate
        if should_fallback(context):
            context = {**context, **fallback_response("Model uncertainty or low confidence")}
        context = validate_and_sanitize(context)

        # 4) Safety: confidence < 0.6 -> force manual review
        context = self._apply_safety_layer(context)

        # 5) Expose tool_chain for audit
        context["tool_chain"] = context.get("_tool_chain", [])
        context.pop("_tool_chain", None)

        inference_time_ms = int((time.perf_counter() - start) * 1000)
        context["inference_time_ms"] = inference_time_ms
        context["agent_id"] = self.agent_id
        context["decision_log"] = self._decision_log_payload(context, inference_time_ms)
        return context
