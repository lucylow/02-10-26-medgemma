# app/backend/tasks.py
import os
import json
import time
import requests
from loguru import logger
from .celery_app import celery_app
from .job_store import write_job
from .webhooks import get_webhook, sign_payload
from .safety_advanced import advanced_safety
from .orchestrator.agent_graph import AgentGraph
from agents.schemas import AgentContext
from typing import Dict

# In a real worker, this would point to the running FastAPI app or the model service directly
# For this orchestration demo, we assume the model service is reachable via an internal URL
MEDGEMMA_URL = os.getenv("MEDGEMMA_URL", "http://localhost:5000/api/analyze")

def _store_result(job_id: str, result: Dict, status: str):
    write_job(job_id, {
        "status": status,
        "result": json.dumps(result),
        "updated_at": time.time()
    })

@celery_app.task(bind=True, name="run_medgemma_pipeline", autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries':3})
def run_medgemma_pipeline(self, job_id: str, med_payload: dict):
    logger.info("Worker picked job {}", job_id)
    
    # 0) Mark running
    write_job(job_id, {"status": "running", "started_at": time.time()})
    
    try:
        # Use AgentGraph for multi-agent reasoning
        ctx = AgentContext(
            case_id=med_payload["case_id"],
            age_months=med_payload["age_months"]
        )

        graph = AgentGraph()
        ctx = graph.run(ctx)

        # Decide next state
        status = "completed" if "safety_review_required" not in ctx.flags else "requires_review"

        # Persist final payload
        final_result = ctx.dict()
        _store_result(job_id, final_result, status)

        # Update notified status to False so poller can attempt delivery if needed,
        # or we can attempt it here as well. 
        # The integrated poller in orchestrator/main.py will also pick this up.
        write_job(job_id, {"notified": False})

        logger.info("Job {} finished with status {}", job_id, status)
        return final_result

    except Exception as e:
        logger.exception("Unhandled error in job {}: {}", job_id, e)
        write_job(job_id, {"status": "failed", "error": str(e), "updated_at": time.time()})
        raise
