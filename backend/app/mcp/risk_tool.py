"""
Risk tool: maps structured signals to risk category.
Used to normalize or override model risk with heuristic.
"""
from typing import Any, Dict

from app.mcp.base_tool import MCPTool

RISK_LEVELS = ("low", "monitor", "high", "refer", "manual_review_required")


class RiskTool(MCPTool):
    name = "risk_tool"

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        risk = context.get("risk", "monitor")
        if risk not in RISK_LEVELS:
            risk = "monitor"
        confidence = context.get("confidence", 0.5)
        if confidence < 0.5:
            risk = "manual_review_required"
        return {"risk_score": risk, "risk_source": "risk_tool", "confidence": confidence}
