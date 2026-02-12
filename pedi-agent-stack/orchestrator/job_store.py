import os, json
import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
rcli = redis.from_url(REDIS_URL, decode_responses=True)

def write_job(job_id: str, mapping: dict):
    key = f"job:{job_id}"
    # Ensure all values are strings for Redis HSET
    safe = {}
    for k, v in mapping.items():
        if isinstance(v, str):
            safe[k] = v
        elif isinstance(v, (dict, list)):
            safe[k] = json.dumps(v)
        else:
            safe[k] = str(v)
    rcli.hset(key, mapping=safe)
    rcli.expire(key, 60 * 60 * 24 * 7)

def read_job(job_id: str) -> dict:
    key = f"job:{job_id}"
    if not rcli.exists(key):
        return None
    d = rcli.hgetall(key)
    # parse result JSON if present
    if "result" in d:
        try:
            d["result"] = json.loads(d["result"])
        except Exception:
            pass
    return d
