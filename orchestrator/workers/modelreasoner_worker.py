"""
ModelReasoner queue worker: consumes tasks from Redis streams, calls inference, acks and optionally updates audit.
Run: python -m orchestrator.workers.modelreasoner_worker
"""
import os
from typing import Any, Dict

import httpx

from orchestrator.workers.base_worker import run_worker

MODELREASONER_ENDPOINT = os.environ.get("MODELREASONER_ENDPOINT", "http://localhost:8002")
TIMEOUT = float(os.environ.get("MODELREASONER_TIMEOUT", "30.0"))


def process_task(task: Dict[str, Any]) -> Dict[str, Any]:
    """Call modelreasoner agent /call and return output."""
    url = f"{MODELREASONER_ENDPOINT.rstrip('/')}/call"
    payload = {
        "request_id": task.get("task_id", ""),
        "case_id": task.get("case_id", ""),
        "payload": task.get("payload", {}),
        "meta": task.get("meta", {}),
    }
    r = httpx.post(url, json=payload, timeout=TIMEOUT)
    r.raise_for_status()
    data = r.json()
    if not data.get("success"):
        raise RuntimeError(data.get("error", {}).get("message", "agent error"))
    return data.get("output") or data


if __name__ == "__main__":
    run_worker(consumer_id="modelreasoner-1", process_fn=process_task)
