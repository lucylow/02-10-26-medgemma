"""
MCP orchestrator: runs model then tool chain (milestone, risk, confidence, etc.).
"""
import logging
from typing import Any, Dict, List, Optional

from app.models.interface import BaseModel
from app.models.post_processor import validate_and_sanitize, should_fallback, fallback_response
from app.mcp.tool_registry import MCPToolRegistry

logger = logging.getLogger(__name__)

# Default tool chain order
DEFAULT_TOOL_CHAIN = ["milestone_tool", "risk_tool", "confidence_tool"]


class MCPOrchestrator:
    def __init__(
        self,
        model: BaseModel,
        tool_registry: MCPToolRegistry,
        tool_chain: Optional[List[str]] = None,
    ):
        self.model = model
        self.tool_registry = tool_registry
        self.tool_chain = tool_chain or DEFAULT_TOOL_CHAIN

    def run_pipeline(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        # 1) Base model inference
        base_output = self.model.infer(input_data)
        context = {**input_data, **base_output}
        context["_tool_chain"] = []

        # 2) Run tools in order (optional; skip if tool missing)
        for tool_name in self.tool_chain:
            try:
                if tool_name not in self.tool_registry._tools:
                    continue
                result = self.tool_registry.run_optional(tool_name, context)
                if result:
                    context["_tool_chain"].append(tool_name)
                    context.update(result)
            except Exception as e:
                logger.warning("Tool %s failed: %s", tool_name, e)

        # 3) Post-process: validate, confidence bound, fallback
        if should_fallback(context):
            context = {**context, **fallback_response("Model uncertainty or low confidence")}
        context = validate_and_sanitize(context)
        # Expose tool_chain for audit; then remove internal key
        context["tool_chain"] = context.get("_tool_chain", [])
        context.pop("_tool_chain", None)
        return context
