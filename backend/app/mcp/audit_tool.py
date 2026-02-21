"""
Audit tool: records tool chain and metadata for audit trail.
Does not perform I/O; returns payload to be logged by caller.
"""
from typing import Any, Dict, List
import time

from app.mcp.base_tool import MCPTool


class AuditTool(MCPTool):
    name = "audit_tool"

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        tool_chain = context.get("_tool_chain", [])
        return {
            "timestamp": time.time(),
            "model_id": context.get("model_id"),
            "adapter_id": context.get("adapter_id"),
            "prompt_version": context.get("prompt_version"),
            "tool_chain": list(tool_chain),
            "confidence": context.get("confidence"),
            "clinician_override": context.get("clinician_override", False),
            "case_id": context.get("case_id"),
        }
