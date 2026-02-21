"""
Triage agent: lightweight pipeline for prioritization — model + risk + confidence only.
Use when full screening tool chain is not needed (e.g. queue ordering).
"""
import logging
import time
from typing import Any, Dict, List

from app.models.interface import BaseModel
from app.models.post_processor import validate_and_sanitize
from app.mcp.tool_registry import MCPToolRegistry

from app.agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)

DEFAULT_TRIAGE_TOOL_CHAIN = ["risk_tool", "confidence_tool"]


class TriageAgent(BaseAgent):
    """
    Triage agent: model -> risk_tool, confidence_tool. No milestone/guideline/audit.
    Lighter latency; still applies safety layer (confidence < 0.6 -> manual review).
    """

    agent_id = "triage_agent"
    default_tool_chain = DEFAULT_TRIAGE_TOOL_CHAIN

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_input(input_data)
        start = time.perf_counter()

        model_output = self._run_model(input_data)
        context = {**input_data, **model_output}
        context["_tool_chain"] = []
        context = self._run_tools(context, use_fallback_on_failure=True)
        context = validate_and_sanitize(context)
        context = self._apply_safety_layer(context)

        context["tool_chain"] = context.get("_tool_chain", [])
        context.pop("_tool_chain", None)

        inference_time_ms = int((time.perf_counter() - start) * 1000)
        context["inference_time_ms"] = inference_time_ms
        context["agent_id"] = self.agent_id
        context["decision_log"] = self._decision_log_payload(context, inference_time_ms)
        return context
