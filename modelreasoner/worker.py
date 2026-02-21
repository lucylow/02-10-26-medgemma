# modelreasoner/worker.py — RQ worker: fetch job, route to edge/cloud model server, write result and audit
import logging
import os
import time
from datetime import datetime
from typing import Optional

import requests
from sqlalchemy.orm import Session

from orchestrator.models import SessionLocal, Job, JobStatus, Audit

logger = logging.getLogger("modelreasoner.worker")
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

EDGE_URL = (os.environ.get("EDGE_MODEL_URL") or "").rstrip("/")
CLOUD_URL = (os.environ.get("CLOUD_MODEL_URL") or "").rstrip("/")
ROUTING_TIMEOUT = int(os.environ.get("ROUTING_TIMEOUT_SECONDS", "10"))

# Prometheus metrics (optional)
try:
    from prometheus_client import Counter, Histogram, Gauge, start_http_server
    METRICS_PORT = int(os.environ.get("METRICS_PORT", "0"))
    if METRICS_PORT > 0:
        start_http_server(METRICS_PORT)
    pedi_jobs_total = Counter("pedi_orch_jobs_total", "Total jobs processed")
    pedi_jobs_failed = Counter("pedi_orch_jobs_failed_total", "Total failed jobs")
    pedi_inference_latency = Histogram("pedi_orch_inference_duration_seconds", "Inference latency seconds")
    pedi_worker_count = Gauge("pedi_orch_worker_count", "Active worker count")
    pedi_db_errors = Counter("pedi_orch_db_errors_total", "DB errors")
    pedi_worker_count.set(1)
except ImportError:
    pedi_jobs_total = pedi_jobs_failed = pedi_inference_latency = pedi_worker_count = pedi_db_errors = None


def _call_model_server(url: str, payload: dict) -> dict:
    try:
        r = requests.post(url, json=payload, timeout=ROUTING_TIMEOUT)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.exception("Model server call failed to %s: %s", url, e)
        raise


def _choose_target(preferred: str) -> str:
    if preferred == "edge" and EDGE_URL:
        return "edge"
    if preferred == "cloud" and CLOUD_URL:
        return "cloud"
    if EDGE_URL:
        return "edge"
    if CLOUD_URL:
        return "cloud"
    raise RuntimeError("No model endpoints configured (EDGE_MODEL_URL/CLOUD_MODEL_URL)")


def process_job(job_id: str):
    """
    RQ worker entrypoint.
    1. Load job from DB
    2. Determine routing target (edge/cloud)
    3. POST to model server
    4. Save result and audit
    """
    if pedi_jobs_total:
        pedi_jobs_total.inc()
    db: Session = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).one_or_none()
        if job is None:
            logger.error("Job %s not found", job_id)
            if pedi_db_errors:
                pedi_db_errors.inc()
            return {"ok": False, "error": "job_not_found"}

        logger.info("Processing job %s (preferred_target=%s)", job_id, (job.payload or {}).get("preferred_target"))
        job.status = JobStatus.RUNNING
        job.updated_at = datetime.utcnow()
        db.add(job)
        db.commit()

        preferred = (job.payload or {}).get("preferred_target", "auto")
        target = _choose_target(preferred)
        url = EDGE_URL if target == "edge" else CLOUD_URL
        if not url:
            raise RuntimeError("No model server URL for target=%s" % target)

        infer_payload = {
            "case_id": job.case_id,
            "age_months": (job.payload or {}).get("age_months"),
            "observations": (job.payload or {}).get("observations"),
            "embedding_b64": (job.payload or {}).get("embedding_b64"),
            "shape": (job.payload or {}).get("shape", [1, 256]),
            "max_new_tokens": 256,
            "temperature": 0.0,
        }

        if pedi_inference_latency:
            with pedi_inference_latency.time():
                rsp = _call_model_server(url, infer_payload)
        else:
            rsp = _call_model_server(url, infer_payload)
        result = rsp.get("result") if isinstance(rsp, dict) and "result" in rsp else rsp

        job.result = result
        job.status = JobStatus.DONE
        job.updated_at = datetime.utcnow()
        db.add(job)
        audit = Audit(job_id=job.id, event="inference_completed", payload=job.result, created_at=datetime.utcnow())
        db.add(audit)
        db.commit()
        logger.info("Job %s completed (target=%s).", job_id, target)
        return {"ok": True, "job_id": job_id, "target": target}
    except Exception as e:
        logger.exception("Job %s failed: %s", job_id, e)
        try:
            job = db.query(Job).filter(Job.id == job_id).one_or_none()
            if job:
                job.status = JobStatus.FAILED
                job.error_text = str(e)[:2048]
                job.updated_at = datetime.utcnow()
                db.add(job)
                audit = Audit(job_id=job.id, event="inference_failed", payload={"error": str(e)}, created_at=datetime.utcnow())
                db.add(audit)
                db.commit()
        except Exception:
            if pedi_db_errors:
                pedi_db_errors.inc()
            logger.exception("Failed to mark job failed for job %s", job_id)
        return {"ok": False, "error": str(e)}
    finally:
        db.close()


if __name__ == "__main__":
    print("RQ worker: run with: rq worker pedi-screen (from repo root, PYTHONPATH=.)")
