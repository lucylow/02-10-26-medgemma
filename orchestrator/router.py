"""
Router: decides sync vs async path and selects agent(s).
Uses AgentRegistry, policies (consent, locality), capability-based scoring, and optional sync attempt.
"""
import math
import os
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx

from orchestrator.agent_registry import AgentRecord, AgentRegistry
from orchestrator.policies import capability_for, filter_by_consent, prefer_edge

SYNC_TIMEOUT = float(os.environ.get("ORCHESTRATOR_SYNC_TIMEOUT", "0.8"))
ROUTER_TOP_N = int(os.environ.get("ORCHESTRATOR_ROUTER_TOP_N", "3"))


def _agent_to_scoring_dict(agent: AgentRecord) -> Dict[str, Any]:
    """Convert AgentRecord to a dict usable by score_agent (latency_p95, cost, etc.)."""
    latency_p95 = agent.latency_ms or 500.0
    cost = "high" if (getattr(agent, "gpu", 0) or 0) > 0 else "low"
    return {
        "agent_id": agent.agent_id,
        "capabilities": agent.capabilities,
        "latency_p95": latency_p95,
        "cost": cost,
        "health": "ok" if agent.health_ok else "error",
        "private_ok": agent.supports_raw_media or (agent.location or "").startswith("edge"),
        "location": agent.location or "cloud",
    }


def score_agent(
    agent: Dict[str, Any],
    hint_caps: List[str],
    urgency: str,
    consent_raw_upload: bool,
) -> float:
    """
    Score an agent for routing. Higher is better.
    Factors: capability match, latency, cost, privacy (on-device vs cloud), urgency boost for triage.
    """
    cap_score = len(set(agent.get("capabilities", [])) & set(hint_caps)) / (len(hint_caps) or 1)
    latency_penalty = max(0.0, (agent.get("latency_p95", 500) - 200) / 2000.0)
    cost_penalty = 1.0 if agent.get("cost") == "low" else 1.5
    private_ok = agent.get("private_ok", False)
    private_penalty = 0.0 if private_ok else (0.5 if not consent_raw_upload else 0.0)
    urgency_boost = 1.5 if urgency in ("high", "urgent") and "triage" in agent.get("capabilities", []) else 1.0
    score = cap_score * urgency_boost / (1.0 + latency_penalty * cost_penalty + private_penalty)
    return score


def route_candidates(
    request: Dict[str, Any],
    registry: AgentRegistry,
    top_n: int = ROUTER_TOP_N,
) -> List[AgentRecord]:
    """
    Capability-based scoring: return top N agents for this request.
    Request should have capability (list), priority (urgency), and payload.consent_given.
    """
    hints = request.get("capability") or request.get("capability_hints") or []
    task_type = request.get("task_type") or request.get("task", "")
    if not hints and task_type:
        hints = capability_for(task_type)
    urgency = request.get("priority", "normal")
    consent = request.get("payload", {}).get("consent_given", False) or (request.get("consent") or {}).get("consent_given", False)
    candidates = registry.find(hints if hints else [task_type or "analyze_light"])
    candidates = filter_by_consent(candidates, request.get("consent") or {"consent_given": consent})
    scored: List[Tuple[float, AgentRecord]] = []
    for c in candidates:
        if not c.health_ok:
            continue
        ad = _agent_to_scoring_dict(c)
        s = score_agent(ad, hints or ad["capabilities"], urgency, consent)
        scored.append((s, c))
    scored.sort(reverse=True, key=lambda x: x[0])
    return [a for _, a in scored[:top_n]]


class Router:
    def __init__(self, registry: Optional[AgentRegistry] = None):
        self.registry = registry or AgentRegistry()

    async def decide_and_route(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compute routing decision: sync (with result) or async (queue name, chosen agent for audit).
        Uses capability-based scoring (route_candidates) then tries sync for fast task types.
        Returns dict with path, result (if sync), queue, chosen_agent, candidate_ids, etc.
        """
        task_type = task.get("task_type", "")
        consent = task.get("consent") or {}
        # Build request shape for route_candidates (capability, priority, payload.consent_given)
        route_req = {
            "task_type": task_type,
            "capability": capability_for(task_type),
            "priority": task.get("priority", "normal"),
            "payload": task.get("payload") or {},
            "consent": consent,
        }
        candidates = route_candidates(route_req, self.registry, top_n=ROUTER_TOP_N)
        # Fallback: if scoring returns none, use legacy find + consent + prefer_edge
        if not candidates:
            capabilities = capability_for(task_type)
            candidates = self.registry.find(capabilities)
            candidates = filter_by_consent(candidates, consent)
            candidates = prefer_edge(candidates)
            candidates.sort(key=lambda c: (not c.health_ok, c.load_score))
        candidate_ids = [c.agent_id for c in candidates]
        chosen = candidates[0] if candidates else None

        # Sync path for fast task types
        if task_type == "analyze_monitor" and candidates:
            for cand in candidates:
                try:
                    res = await self._try_sync(cand, task, timeout=SYNC_TIMEOUT)
                    if res is not None:
                        return {
                            "path": "sync",
                            "agent_id": cand.agent_id,
                            "result": res,
                            "candidate_ids": candidate_ids,
                            "queue": None,
                        }
                except Exception:
                    continue

        # Async path
        qname = self._select_queue(task)
        return {
            "path": "async",
            "queue": qname,
            "chosen_agent": chosen.agent_id if chosen else None,
            "candidate_ids": candidate_ids,
            "result": None,
        }

    async def _try_sync(self, agent: AgentRecord, task: Dict[str, Any], timeout: float = 0.8) -> Optional[Dict]:
        """Call agent endpoint with short timeout; return result or None."""
        url = f"{agent.endpoint.rstrip('/')}/call"
        payload = {
            "request_id": task.get("task_id", ""),
            "case_id": task.get("case_id", ""),
            "payload": task.get("payload", {}),
            "meta": task.get("meta", {}),
        }
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(url, json=payload)
            if r.status_code == 200:
                data = r.json()
                if data.get("success"):
                    return data.get("output") or data
            return None

    def _select_queue(self, task: Dict[str, Any]) -> str:
        priority = task.get("priority", "normal")
        return {
            "urgent": "tasks:urgent",
            "high": "tasks:high",
            "normal": "tasks:normal",
            "low": "tasks:low",
        }.get(priority, "tasks:normal")
