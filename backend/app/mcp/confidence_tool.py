"""
Confidence tool: calibrated confidence = model_confidence * data_quality_factor.
"""
from typing import Any, Dict

from app.mcp.base_tool import MCPTool

CONFIDENCE_FLOOR = 0.5
CONFIDENCE_CEILING = 0.95


class ConfidenceTool(MCPTool):
    name = "confidence_tool"

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        raw = context.get("confidence", 0.5)
        try:
            model_conf = max(0.0, min(1.0, float(raw)))
        except (TypeError, ValueError):
            model_conf = 0.5
        # Data quality factor: 1.0 if observations present and not empty
        obs = (context.get("observations") or "").strip()
        data_quality = 1.0 if len(obs) > 10 else 0.85
        calibrated = model_conf * data_quality
        calibrated = max(CONFIDENCE_FLOOR, min(CONFIDENCE_CEILING, calibrated))
        return {
            "confidence": calibrated,
            "model_confidence": model_conf,
            "data_quality_factor": data_quality,
            "requires_clinician_review": calibrated < 0.6,
        }
