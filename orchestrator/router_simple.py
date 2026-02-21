# orchestrator/router_simple.py
"""
Routing heuristics for choosing agents (lightweight, in-memory registry).

Simple capability-based scorer with latency/cost/privacy considerations.
This is deliberately small and testable. Replace AGENT_REGISTRY with DB lookup in prod.
"""

from typing import Any, Dict, List
import logging

logger = logging.getLogger(__name__)

# Example registry. In production, fetch from DB/Service Discovery.
# base_url is used by route_and_call to build HTTPAgent.
AGENT_REGISTRY: List[Dict[str, Any]] = [
    {
        "agent_id": "embedder-v1",
        "capabilities": ["embed"],
        "latency_p95": 200,
        "cost": "low",
        "health": "ok",
        "private_ok": True,
        "base_url": "http://embedder-v1:8000",
    },
    {
        "agent_id": "vision-v1",
        "capabilities": ["vision"],
        "latency_p95": 400,
        "cost": "low",
        "health": "ok",
        "private_ok": True,
        "base_url": "http://vision-v1:8000",
    },
    {
        "agent_id": "reasoner-gpu",
        "capabilities": ["reason"],
        "latency_p95": 2500,
        "cost": "high",
        "health": "ok",
        "private_ok": False,
        "base_url": "http://reasoner-gpu:8000",
    },
    {
        "agent_id": "triage-small",
        "capabilities": ["triage"],
        "latency_p95": 150,
        "cost": "low",
        "health": "ok",
        "private_ok": True,
        "base_url": "http://triage-small:8000",
    },
]


def score_agent(
    agent: Dict[str, Any],
    hint_caps: List[str],
    urgency: str,
    consent_raw_upload: bool,
) -> float:
    """
    Compute a simple score (higher is better) for routing.
    Components:
      - capability overlap
      - latency penalty
      - cost multiplier
      - privacy penalty (if agent not private_ok and no consent)
      - urgency boost for triage agents
    """
    try:
        cap_overlap = len(set(agent.get("capabilities", [])) & set(hint_caps))
        cap_score = cap_overlap / (len(hint_caps) or 1)

        latency = float(agent.get("latency_p95", 1000))
        latency_penalty = max(0.0, (latency - 200.0) / 2000.0)

        cost = agent.get("cost", "low")
        cost_multiplier = 1.0 if cost == "low" else 1.5

        private_ok = agent.get("private_ok", True)
        private_penalty = 0.0 if private_ok else (0.5 if not consent_raw_upload else 0.0)

        urgency_boost = 1.0
        if urgency == "high" and "triage" in agent.get("capabilities", []):
            urgency_boost = 1.5

        score = (cap_score * urgency_boost) / (
            1.0 + latency_penalty * cost_multiplier + private_penalty
        )
        return float(score)
    except Exception as exc:
        logger.exception("Error scoring agent: %s", exc)
        return 0.0


def route(request_envelope: Dict[str, Any], top_k: int = 3) -> List[Dict[str, Any]]:
    """
    Return a ranked list of candidate agents (top_k) for the envelope.
    """
    hints = request_envelope.get("capability", []) or []
    urgency = request_envelope.get("priority", "normal")
    payload = request_envelope.get("payload", {})
    consent = bool(payload.get("consent_given", False))

    scored = []
    for agent in AGENT_REGISTRY:
        if agent.get("health") != "ok":
            continue
        s = score_agent(agent, hints, urgency, consent)
        scored.append((s, agent))

    scored.sort(reverse=True, key=lambda x: x[0])
    selected = [a for s, a in scored[:top_k]]
    return selected
