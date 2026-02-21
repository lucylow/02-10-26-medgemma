"""
Base worker: Redis Streams consumer with XREADGROUP, XACK, retry and DLQ.
Subclass and implement process_task(task) -> result.
"""
import json
import os
import uuid
from typing import Any, Dict, List, Optional

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
STREAMS = ["tasks:urgent", "tasks:high", "tasks:normal"]
GROUP = "workers"
MAX_RETRIES = int(os.environ.get("ORCHESTRATOR_TASK_MAX_RETRIES", "3"))
DLQ_STREAM = "tasks:dlq"


def _redis():
    import redis
    return redis.Redis.from_url(REDIS_URL, decode_responses=False)


def ensure_consumer_groups(r, streams: List[str], group: str):
    for stream in streams:
        try:
            r.xgroup_create(stream, group, id="0", mkstream=True)
        except Exception as e:
            if "BUSYGROUP" not in str(e):
                pass  # ignore already exists


def process_task(task: Dict[str, Any]) -> Dict[str, Any]:
    """Override in subclass. Return result dict or raise."""
    raise NotImplementedError


def publish_result(task_id: str, result: Dict[str, Any]) -> None:
    """Optional: push to result store or callback URL. Stub."""
    pass


def enqueue_dlq(task: Dict[str, Any], reason: str = "max_retries") -> None:
    from orchestrator.queue import enqueue_dlq as _enqueue_dlq
    _enqueue_dlq(task, reason=reason)


def run_worker(consumer_id: Optional[str] = None, process_fn=None):
    consumer_id = consumer_id or f"worker-{uuid.uuid4().hex[:8]}"
    process_fn = process_fn or process_task
    r = _redis()
    ensure_consumer_groups(r, STREAMS, GROUP)
    while True:
        res = r.xreadgroup(GROUP, consumer_id, {s: ">" for s in STREAMS}, count=1, block=5000)
        if not res:
            continue
        for stream_name, messages in res:
            stream_name = stream_name.decode() if isinstance(stream_name, bytes) else stream_name
            for msg_id, body in messages:
                msg_id = msg_id.decode() if isinstance(msg_id, bytes) else msg_id
                try:
                    data = body.get(b"data", b"{}")
                    task = json.loads(data.decode() if isinstance(data, bytes) else data)
                except Exception as e:
                    r.xack(stream_name, GROUP, msg_id)
                    continue
                meta = task.get("meta") or {}
                retries = meta.get("retries", 0)
                try:
                    result = process_fn(task)
                    r.xack(stream_name, GROUP, msg_id)
                    publish_result(task.get("task_id"), result)
                except Exception as e:
                    if retries >= MAX_RETRIES:
                        task["meta"] = {**meta, "retries": retries + 1, "last_error": str(e)}
                        enqueue_dlq(task, reason="max_retries")
                        r.xack(stream_name, GROUP, msg_id)
                    else:
                        task["meta"] = {**meta, "retries": retries + 1}
                        # re-add to stream (or leave unacked for reclaim)
                        r.xadd(stream_name, {"data": json.dumps(task)}, maxlen=10000, approximate=True)
                        r.xack(stream_name, GROUP, msg_id)
