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
        return self._tools[tool_name].execute(context)

    def run_optional(self, tool_name: str, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            return self.run(tool_name, context)
        except Exception as e:
            logger.warning("Tool %s failed: %s", tool_name, e)
            return None

    def list_tools(self) -> List[str]:
        return list(self._tools.keys())
