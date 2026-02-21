"""
Queue layer: Redis Streams for priority task queues.
Streams: tasks:urgent, tasks:high, tasks:normal, tasks:low.
"""
import json
import os
from typing import Any, Dict, Optional

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
STREAM_MAXLEN = int(os.environ.get("ORCHESTRATOR_STREAM_MAXLEN", "10000"))

PRIORITY_STREAM_MAP = {
    "urgent": "tasks:urgent",
    "high": "tasks:high",
    "normal": "tasks:normal",
    "low": "tasks:low",
}

DLQ_STREAM = "tasks:dlq"


def _redis() -> "redis.Redis":
    import redis
    return redis.Redis.from_url(REDIS_URL, decode_responses=False)


def enqueue_task(task: Dict[str, Any], queue_name: Optional[str] = None) -> str:
    """
    Add task to the appropriate Redis stream by priority.
    Returns message id.
    """
    r = _redis()
    stream = queue_name or PRIORITY_STREAM_MAP.get(task.get("priority", "normal"), "tasks:normal")
    msg_id = r.xadd(
        stream,
        {"data": json.dumps(task)},
        maxlen=STREAM_MAXLEN,
        approximate=True,
    )
    return msg_id.decode() if isinstance(msg_id, bytes) else msg_id


def stream_length(stream: str) -> int:
    """Return current length of stream (for orchestrator_queue_size metric)."""
    r = _redis()
    return r.xlen(stream)


def enqueue_dlq(task: Dict[str, Any], reason: str = "max_retries") -> str:
    """Move task to dead-letter stream."""
    task = dict(task)
    task["meta"] = task.get("meta") or {}
    task["meta"]["dlq_reason"] = reason
    r = _redis()
    msg_id = r.xadd(DLQ_STREAM, {"data": json.dumps(task)}, maxlen=STREAM_MAXLEN, approximate=True)
    return msg_id.decode() if isinstance(msg_id, bytes) else msg_id
