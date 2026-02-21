# orchestrator/queue_rq.py — RQ (Redis Queue) wrapper for job queueing
import logging
import os

from redis import Redis
from rq import Queue

logger = logging.getLogger("orchestrator.queue")

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
redis_conn = Redis.from_url(REDIS_URL)
queue = Queue("pedi-screen", connection=redis_conn, default_timeout=60 * 10)


def enqueue_job(job_id: str):
    """
    Enqueue an RQ job that will call modelreasoner.worker.process_job(job_id).
    Returns the RQ job id.
    """
    from modelreasoner.worker import process_job
    rq_job = queue.enqueue(process_job, job_id)
    logger.info("Enqueued RQ job %s for orchestration job %s", rq_job.id, job_id)
    return rq_job.id


def get_rq_job_status(rq_id: str):
    from rq.job import Job as RQJob
    try:
        rq_job = RQJob.fetch(rq_id, connection=redis_conn)
        return rq_job.get_status()
    except Exception:
        return None


def get_rq_job_result(rq_id: str):
    from rq.job import Job as RQJob
    try:
        rq_job = RQJob.fetch(rq_id, connection=redis_conn)
        return rq_job.result
    except Exception:
        return None
