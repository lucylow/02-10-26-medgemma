"""
MCP tool registry: register and run tools by name. Tool whitelist only.
"""
import logging
from typing import Any, Dict, List, Optional

from app.mcp.base_tool import MCPTool

logger = logging.getLogger(__name__)

# Whitelist: only these tools can be invoked (security, PAGE 16)
ALLOWED_TOOLS = frozenset({
    "milestone_tool",
    "risk_tool",
    "guideline_tool",
    "audit_tool",
    "confidence_tool",
})


class MCPToolRegistry:
    def __init__(self) -> None:
        self._tools: Dict[str, MCPTool] = {}

    def register(self, tool: MCPTool) -> None:
        if tool.name not in ALLOWED_TOOLS:
            logger.warning("Tool %s not in whitelist; registering anyway for dev", tool.name)
        self._tools[tool.name] = tool

    def run(self, tool_name: str, context: Dict[str, Any]) -> Dict[str, Any]:
        if tool_name not in ALLOWED_TOOLS:
            raise ValueError(f"Tool not allowed: {tool_name}")
        if tool_name not in self._tools:
            raise ValueError(f"Tool not found: {tool_name}")
        tool = self._tools[tool_name]
        if hasattr(tool, "run") and callable(tool.run):
            return tool.run(context)
        return tool.execute(context)

    def run_optional(self, tool_name: str, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            return self.run(tool_name, context)
        except Exception as e:
            logger.warning("Tool %s failed: %s", tool_name, e)
            return None

    def run_with_fallback(self, tool_name: str, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Run tool; on failure return conservative fallback dict (never raise).
        Caller can merge result; fallback signals manual_review_required for safety.
        """
        try:
            return self.run(tool_name, context)
        except Exception as e:
            logger.warning("Tool %s failed (fallback): %s", tool_name, e)
            return {
                "risk": "manual_review_required",
                "tool_failed": True,
                "failed_tool": tool_name,
                "requires_clinician_review": True,
                "review_reason": f"Tool {tool_name} failed; conservative escalation",
            }

    def list_tools(self) -> List[str]:
        return list(self._tools.keys())
