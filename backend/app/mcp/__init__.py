"""
MCP tool layer: registry, tools, orchestrator.
"""
from app.mcp.base_tool import MCPTool
from app.mcp.tool_registry import MCPToolRegistry, ALLOWED_TOOLS
from app.mcp.milestone_tool import MilestoneTool
from app.mcp.risk_tool import RiskTool
from app.mcp.guideline_tool import GuidelineTool
from app.mcp.confidence_tool import ConfidenceTool
from app.mcp.audit_tool import AuditTool
from app.mcp.orchestrator import MCPOrchestrator, DEFAULT_TOOL_CHAIN

__all__ = [
    "MCPTool",
    "MCPToolRegistry",
    "ALLOWED_TOOLS",
    "MilestoneTool",
    "RiskTool",
    "GuidelineTool",
    "ConfidenceTool",
    "AuditTool",
    "MCPOrchestrator",
    "DEFAULT_TOOL_CHAIN",
]


def create_default_registry() -> MCPToolRegistry:
    reg = MCPToolRegistry()
    reg.register(MilestoneTool())
    reg.register(RiskTool())
    reg.register(GuidelineTool())
    reg.register(ConfidenceTool())
    reg.register(AuditTool())
    return reg
