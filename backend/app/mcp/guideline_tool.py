"""
Guideline tool: maps risk to WHO/AAP-style guidance references.
"""
from typing import Any, Dict, List

from app.mcp.base_tool import MCPTool

RISK_GUIDELINES = {
    "low": ["Routine developmental surveillance.", "AAP Bright Futures periodicity."],
    "monitor": ["Re-screen in 3 months.", "Share with PCP; consider referral if persistent."],
    "high": ["Refer for further evaluation.", "Early intervention referral as indicated."],
    "refer": ["Urgent referral for developmental evaluation.", "Document parent concerns."],
    "manual_review_required": ["Clinician review required before next steps.", "Complete assessment."],
}


class GuidelineTool(MCPTool):
    name = "guideline_tool"

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        risk = context.get("risk", "monitor")
        guidelines = RISK_GUIDELINES.get(risk, RISK_GUIDELINES["manual_review_required"])
        return {"guidelines": guidelines, "risk": risk}
