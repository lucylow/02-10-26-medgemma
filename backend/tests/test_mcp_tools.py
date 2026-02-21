"""
Tests for MCP tools: registry, milestone, risk, guideline, confidence, audit, orchestrator.
"""
import pytest

from app.mcp.base_tool import MCPTool
from app.mcp.tool_registry import MCPToolRegistry, ALLOWED_TOOLS
from app.mcp.milestone_tool import MilestoneTool
from app.mcp.risk_tool import RiskTool
from app.mcp.guideline_tool import GuidelineTool
from app.mcp.confidence_tool import ConfidenceTool
from app.mcp.audit_tool import AuditTool
from app.mcp.orchestrator import MCPOrchestrator
from app.mcp import create_default_registry
from app.models.mock_model import MockModel


def test_milestone_tool():
    t = MilestoneTool()
    ctx = {"age_months": 24}
    out = t.execute(ctx)
    assert "milestones" in out and "age_band_months" in out
    assert out["age_band_months"] == 24
    assert isinstance(out["milestones"], list)


def test_risk_tool():
    t = RiskTool()
    out = t.execute({"risk": "monitor", "confidence": 0.7})
    assert out["risk_score"] == "monitor"
    out2 = t.execute({"risk": "x", "confidence": 0.3})
    assert out2["risk_score"] == "manual_review_required"


def test_guideline_tool():
    t = GuidelineTool()
    out = t.execute({"risk": "refer"})
    assert "guidelines" in out and len(out["guidelines"]) > 0


def test_confidence_tool():
    t = ConfidenceTool()
    out = t.execute({"confidence": 0.8, "observations": "Some text here that is long enough."})
    assert 0.5 <= out["confidence"] <= 0.95
    out2 = t.execute({"confidence": 0.1, "observations": ""})
    assert out2.get("requires_clinician_review") is True


def test_audit_tool():
    t = AuditTool()
    ctx = {"case_id": "c1", "model_id": "mock", "_tool_chain": ["milestone_tool"]}
    out = t.execute(ctx)
    assert "timestamp" in out and out["case_id"] == "c1"
    assert "milestone_tool" in out["tool_chain"]


def test_registry_run():
    reg = MCPToolRegistry()
    reg.register(MilestoneTool())
    out = reg.run("milestone_tool", {"age_months": 36})
    assert "milestones" in out
    with pytest.raises(ValueError):
        reg.run("nonexistent", {})
    with pytest.raises(ValueError):
        reg.run("forbidden_tool_name", {})


def test_registry_run_optional():
    reg = MCPToolRegistry()
    reg.register(RiskTool())
    out = reg.run_optional("risk_tool", {"risk": "low"})
    assert out is not None
    out2 = reg.run_optional("nonexistent", {})
    assert out2 is None


def test_orchestrator_pipeline():
    model = MockModel()
    reg = create_default_registry()
    orch = MCPOrchestrator(model, reg)
    input_data = {
        "case_id": "orch-1",
        "age_months": 24,
        "observations": "Child says a few words.",
        "embedding_b64": "dummy",
        "shape": [1, 256],
    }
    out = orch.run_pipeline(input_data)
    assert "summary" in out and "risk" in out and "confidence" in out
    assert "tool_chain" in out
    assert "milestone_tool" in out["tool_chain"] or "risk_tool" in out["tool_chain"]
    assert "recommendations" in out
