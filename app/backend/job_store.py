import redis
import json
import os
from typing import Dict, Any, Optional

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
r = None
try:
    r = redis.from_url(REDIS_URL, decode_responses=True)
    r.ping()
except Exception as e:
    from loguru import logger
    logger.error("Failed to connect to Redis: {}", e)

rcli = r # Alias for poller

JOB_PREFIX = "pedi_job:"
REDIS_TTL = 60*60*24*7  # 7 days

def write_job(job_id: str, data: Dict[str, Any]):
    if r is None:
        from loguru import logger
        logger.warning("Redis not available, job {} not written", job_id)
        return
    key = f"{JOB_PREFIX}{job_id}"
    try:
        # Use HSET for atomic updates
        r.hset(key, mapping=data)
        r.expire(key, REDIS_TTL)
    except Exception as e:
        from loguru import logger
        logger.error("Failed to write job to Redis: {}", e)

def read_job(job_id: str) -> Dict[str, Any]:
    if r is None:
        return {}
    key = f"{JOB_PREFIX}{job_id}"
    try:
        return r.hgetall(key)
    except Exception as e:
        from loguru import logger
        logger.error("Failed to read job from Redis: {}", e)
        return {}

def list_jobs():
    """Returns job IDs without the prefix."""
    if r is None:
        return []
    try:
        keys = r.keys(f"{JOB_PREFIX}*")
        return [k[len(JOB_PREFIX):] for k in keys]
    except Exception as e:
        from loguru import logger
        logger.error("Failed to list jobs from Redis: {}", e)
        return []
