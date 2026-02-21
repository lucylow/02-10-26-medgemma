"""
Router: decides sync vs async path and selects agent(s).
Uses AgentRegistry, policies (consent, locality), and optional sync attempt.
"""
import os
from typing import Any, Dict, List, Optional

import httpx

from orchestrator.agent_registry import AgentRecord, AgentRegistry
from orchestrator.policies import capability_for, filter_by_consent, prefer_edge

SYNC_TIMEOUT = float(os.environ.get("ORCHESTRATOR_SYNC_TIMEOUT", "0.8"))


class Router:
    def __init__(self, registry: Optional[AgentRegistry] = None):
        self.registry = registry or AgentRegistry()

    async def decide_and_route(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compute routing decision: sync (with result) or async (queue name, chosen agent for audit).
        Returns dict with path, result (if sync), queue, chosen_agent, candidate_ids, etc.
        """
        task_type = task.get("task_type", "")
        consent = task.get("consent") or {}
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
