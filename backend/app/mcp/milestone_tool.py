"""
Milestone tool: developmental expectations by age band.
Returns age-expected milestones and gap signals for explainability.
"""
from typing import Any, Dict

from app.mcp.base_tool import MCPTool

# Simplified age-band expectations (months) for demo; replace with full guideline data
AGE_BAND_MILESTONES = {
    12: ["single words", "pointing", "walk with support"],
    18: ["~20 words", "follow simple commands", "walk alone"],
    24: ["2-word phrases", "50+ words", "run", "point to body parts"],
    36: ["3–4 word sentences", "questions", "colors", "pretend play"],
    48: ["stories", "counting", "complex sentences"],
}


class MilestoneTool(MCPTool):
    name = "milestone_tool"

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        age_months = context.get("age_months")
        if age_months is None:
            return {"milestones": [], "age_band": None, "gaps": []}
        age = int(age_months)
        band = max((a for a in AGE_BAND_MILESTONES if a <= age), default=12)
        milestones = AGE_BAND_MILESTONES.get(band, [])
        # Optional: compare model summary to expected milestones and return gaps
        summary_list = context.get("summary") or []
        gaps = []
        return {
            "milestones": milestones,
            "age_band_months": band,
            "gaps": gaps,
            "explainability": [
                {"type": "milestone_band", "feature": "age_expected", "age_expected": band, "confidence_weight": 0.3}
            ],
        }
