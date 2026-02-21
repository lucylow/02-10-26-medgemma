"""
AI agents layer: model + MCP tool orchestration with safety and audit.
"""
from app.agents.base_agent import BaseAgent, CONFIDENCE_MANUAL_REVIEW_THRESHOLD
from app.agents.screening_agent import ScreeningAgent, DEFAULT_SCREENING_TOOL_CHAIN
from app.agents.triage_agent import TriageAgent, DEFAULT_TRIAGE_TOOL_CHAIN
from app.agents.audit_agent import AuditAgent

__all__ = [
    "BaseAgent",
    "CONFIDENCE_MANUAL_REVIEW_THRESHOLD",
    "ScreeningAgent",
    "DEFAULT_SCREENING_TOOL_CHAIN",
    "TriageAgent",
    "DEFAULT_TRIAGE_TOOL_CHAIN",
    "AuditAgent",
]
