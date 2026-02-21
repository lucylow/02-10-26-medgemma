"""
Agent capability discovery and health registry.
Simple in-memory store keyed by agent_id; optional Redis backing.
Agents register on startup and send heartbeats; TTL drops stale agents.
"""
import os
import time
from dataclasses import dataclass, field
from typing import List, Optional

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
AGENT_TTL_SECONDS = int(os.environ.get("ORCHESTRATOR_AGENT_TTL", "120"))


@dataclass
class AgentRecord:
    agent_id: str
    capabilities: List[str]
    endpoint: str
    last_seen: float = field(default_factory=time.time)
    health_status: str = "ok"
    latency_ms: Optional[float] = None
    location: str = "cloud"
    version: str = ""
    supports_raw_media: bool = False
    cpu: float = 0
    mem_mb: float = 0
    gpu: int = 0
    load_score: float = 0.0  # lower is better

    @property
    def health_ok(self) -> bool:
        return self.health_status == "ok" and (time.time() - self.last_seen) < AGENT_TTL_SECONDS


class AgentRegistry:
    """In-memory agent registry; can be backed by Redis hash later."""

    def __init__(self, ttl_seconds: int = AGENT_TTL_SECONDS):
        self._agents: dict[str, AgentRecord] = {}
        self._ttl = ttl_seconds

    def register(self, agent_id: str, capabilities: List[str], endpoint: str, **kwargs) -> None:
        rec = self._agents.get(agent_id)
        if rec:
            rec.capabilities = capabilities
            rec.endpoint = endpoint
            rec.last_seen = time.time()
            for k, v in kwargs.items():
                if hasattr(rec, k):
                    setattr(rec, k, v)
        else:
            self._agents[agent_id] = AgentRecord(
                agent_id=agent_id,
                capabilities=capabilities,
                endpoint=endpoint,
                **kwargs,
            )

    def heartbeat(self, agent_id: str, health_status: str = "ok", latency_ms: Optional[float] = None, load_score: float = 0.0) -> None:
        rec = self._agents.get(agent_id)
        if rec:
            rec.last_seen = time.time()
            rec.health_status = health_status
            rec.latency_ms = latency_ms
            rec.load_score = load_score

    def find(self, capabilities: List[str]) -> List[AgentRecord]:
        """Return agents that advertise any of the given capabilities and are not stale."""
        now = time.time()
        out = []
        for rec in self._agents.values():
            if now - rec.last_seen > self._ttl:
                continue
            if not rec.capabilities:
                continue
            if any(c in rec.capabilities for c in capabilities):
                out.append(rec)
        return out

    def get(self, agent_id: str) -> Optional[AgentRecord]:
        rec = self._agents.get(agent_id)
        if rec and (time.time() - rec.last_seen) <= self._ttl:
            return rec
        return None

    def list_all(self) -> List[AgentRecord]:
        now = time.time()
        return [r for r in self._agents.values() if now - r.last_seen <= self._ttl]
