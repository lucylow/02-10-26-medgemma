"""
Unit tests: routing policy (consent, capability, locality).
"""
import pytest
from orchestrator.agent_registry import AgentRecord, AgentRegistry
from orchestrator.policies import capability_for, filter_by_consent, prefer_edge, allows_raw_media


def test_capability_for():
    assert "embed" in capability_for("embed")
    assert "analyze_light" in capability_for("analyze_monitor") or "analyze_monitor" in capability_for("analyze_monitor")
    assert capability_for("unknown") == ["unknown"]


def test_allows_raw_media():
    assert allows_raw_media({"consent_given": True}) is True
    assert allows_raw_media({"consent_given": False}) is False
    assert allows_raw_media({}) is False
    assert allows_raw_media(None) is False


def test_filter_by_consent():
    class C:
        def __init__(self, supports_raw_media):
            self.supports_raw_media = supports_raw_media
    candidates = [C(True), C(False)]
    assert len(filter_by_consent(candidates, {"consent_given": True})) == 2
    assert len(filter_by_consent(candidates, {"consent_given": False})) == 1
    assert filter_by_consent(candidates, {"consent_given": False})[0].supports_raw_media is False


def test_prefer_edge():
    class C:
        def __init__(self, location):
            self.location = location
    candidates = [C("cloud"), C("edge-clinic-5"), C("cloud2")]
    ordered = prefer_edge(candidates)
    assert ordered[0].location == "edge-clinic-5"
    assert ordered[1].location in ("cloud", "cloud2")
