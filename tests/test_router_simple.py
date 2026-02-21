# tests/test_router_simple.py
"""Unit tests for lightweight in-memory router (score_agent, route)."""
import pytest

from orchestrator.router_simple import score_agent, route, AGENT_REGISTRY


def test_score_agent_basic():
    a = {
        "agent_id": "a1",
        "capabilities": ["embed", "vision"],
        "latency_p95": 150,
        "cost": "low",
        "health": "ok",
        "private_ok": True,
    }
    score = score_agent(a, hint_caps=["embed"], urgency="normal", consent_raw_upload=False)
    assert score > 0


def test_route_prefers_matching_capability(monkeypatch):
    monkeypatch.setattr(
        "orchestrator.router_simple.AGENT_REGISTRY",
        [
            {"agent_id": "low-latency", "capabilities": ["triage"], "latency_p95": 100, "cost": "low", "health": "ok", "private_ok": True},
            {"agent_id": "reasoner", "capabilities": ["reason"], "latency_p95": 2000, "cost": "high", "health": "ok", "private_ok": False},
            {"agent_id": "embedder", "capabilities": ["embed"], "latency_p95": 200, "cost": "low", "health": "ok", "private_ok": True},
        ],
    )
    req = {"capability": ["embed"], "priority": "normal", "payload": {"consent_given": False}}
    selected = route(req, top_k=2)
    assert selected[0]["agent_id"] == "embedder"


def test_route_respects_privacy(monkeypatch):
    monkeypatch.setattr(
        "orchestrator.router_simple.AGENT_REGISTRY",
        [
            {"agent_id": "cloud-reason", "capabilities": ["reason"], "latency_p95": 1500, "cost": "high", "health": "ok", "private_ok": False},
            {"agent_id": "local-reason", "capabilities": ["reason"], "latency_p95": 800, "cost": "low", "health": "ok", "private_ok": True},
        ],
    )
    req = {"capability": ["reason"], "priority": "normal", "payload": {"consent_given": False}}
    selected = route(req, top_k=1)
    assert selected[0]["agent_id"] == "local-reason"
