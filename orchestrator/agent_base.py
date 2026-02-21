"""
Agent base: callable skill interface for the multi-agent orchestrator.
All agents (embedder, vision, reasoner, triage, explain, etc.) implement this contract.
Agents may be HTTP services or local wrappers; the orchestrator routes and invokes via handle().
"""
from abc import ABC, abstractmethod
from typing import Any, Dict

import requests
import logging

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """Standard interface for composable, callable agents."""

    def __init__(self, agent_id: str):
        self.agent_id = agent_id

    @abstractmethod
    def health(self) -> Dict[str, Any]:
        """Return health status for registry and routing. E.g. {"status": "ok", "meta": {}}."""
        pass

    @abstractmethod
    def handle(self, request_envelope: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process the request and return the standard agent response envelope (dict).
        Envelope should include: request_id, agent_id, model_version, adapter_id,
        response_ts, duration_ms, result, confidence, evidence, logs.
        """
        pass


class HTTPAgent(BaseAgent):
    """
    Agent that delegates to an HTTP service (GET /health, POST /call).
    Accepts url or base_url for compatibility.
    """

    def __init__(
        self,
        agent_id: str,
        url: str = "",
        base_url: str = "",
        timeout: int = 10,
    ):
        super().__init__(agent_id)
        self._base = (base_url or url or "").rstrip("/")
        self.url = self._base
        self.base_url = self._base
        self.timeout = timeout

    def health(self) -> Dict[str, Any]:
        try:
            r = requests.get(f"{self.base_url}/health", timeout=2)
            if r.ok:
                return {"status": "ok", "meta": r.json()}
            return {"status": "error", "meta": r.text}
        except Exception as e:
            logger.exception("Agent health check failed")
            return {"status": "error", "error": str(e)}

    def handle(self, request_envelope: Dict[str, Any]) -> Dict[str, Any]:
        """POST /call to the agent and return JSON."""
        try:
            r = requests.post(
                f"{self.base_url}/call",
                json=request_envelope,
                timeout=self.timeout,
            )
            r.raise_for_status()
            return r.json()
        except requests.RequestException as e:
            logger.exception("Agent HTTP call failed")
            raise
