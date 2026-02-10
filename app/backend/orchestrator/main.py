"""
Fully integrated orchestrator for PediScreen AI (copy-paste ready).

Features:
- POST /v1/process_case -> computes/accepts embedding, enqueues Celery job, writes job store
- GET  /v1/jobs/{job_id}  -> poll job status/result
- POST /v1/webhooks/register -> register a webhook for a clinic
- GET  /v1/webhooks/{clinic_id} -> inspect webhook
- POST /v1/case/{case_id}/signoff -> clinician sign-off, triggers parent delivery + audit
- Background poller -> monitors job_store for completed/requires_review jobs and delivers webhooks once
- Audit logging of major events via audit_service.append_audit()

Assumptions:
- sibling modules exist in orchestrator/: job_store.py, tasks.py, webhooks.py,
  embedding_service.py, audit_service.py, parent_service.py
- Celery worker (tasks.run_medgemma_pipeline) is configured and updates the job_store.
- Redis is used by job_store; job keys are 'job:{job_id}'.

Drop this file into orchestrator/ and rebuild your orchestrator image.
"""

import os
import uuid
import time
import json
import asyncio
import base64
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, Request, HTTPException, Header
from pydantic import BaseModel
from loguru import logger
import requests
import sys

# Ensure parent directory is in path to find sibling modules if this is in a subdirectory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Local modules (expected to exist in parent or same dir)
try:
    from job_store import write_job, read_job
    from tasks import run_medgemma_pipeline
    from webhooks import register_webhook as register_wh, get_webhook as get_wh, sign_payload
    from embedding_service import compute_embedding
    from audit_service import append_audit
    from parent_service import rewrite_for_parent
except ImportError:
    # Try importing from the same directory if they are siblings
    from .job_store import write_job, read_job
    from .tasks import run_medgemma_pipeline
    from .webhooks import register_webhook as register_wh, get_webhook as get_wh, sign_payload
    from .embedding_service import compute_embedding
    from .audit_service import append_audit
    from .parent_service import rewrite_for_parent

# Config / env
POLL_INTERVAL = float(os.getenv("JOB_POLL_INTERVAL", "3.0"))  # seconds
DEFAULT_CLINIC_ID = os.getenv("DEFAULT_CLINIC_ID", "demo-clinic")
ORCHESTRATOR_HOST = os.getenv("ORCHESTRATOR_HOST", "http://localhost:7000")

app = FastAPI(title="PediScreen Orchestrator (Integrated)")

# --- Pydantic request schemas ---


class ProcessRequest(BaseModel):
    case_id: Optional[str] = None
    age_months: int = 0
    observations: Optional[str] = ""
    # Optional: client can provide precomputed embedding
    embedding_b64: Optional[str] = None
    embedding_shape: Optional[List[int]] = None
    # For dev only: local path to image
    image_path: Optional[str] = None
    clinic_id: Optional[str] = None


class SignoffRequest(BaseModel):
    job_id: str
    clinician_id: str
    notes: Optional[str] = None


class WebhookRegisterPayload(BaseModel):
    clinic_id: str
    url: str
    secret: Optional[str] = None


# --- Helpers ---


def new_case_id() -> str:
    return str(uuid.uuid4())


def new_job_id() -> str:
    return str(uuid.uuid4())


def get_embedding_or_compute_sync(req: ProcessRequest) -> Dict[str, Any]:
    """
    Prefer client-provided embedding; otherwise compute via embedding_service (sync).
    Falls back to deterministic zero-vector if embedding fails.
    """
    if req.embedding_b64 and req.embedding_shape:
        logger.debug("Using client-provided embedding for case_id=%s", req.case_id)
        return {"model": "client-provided", "b64": req.embedding_b64, "shape": req.embedding_shape}
    try:
        emb = compute_embedding(image_path=req.image_path, image_b64=None)
        return emb
    except Exception as e:
        logger.warning("compute_embedding failed, using fallback: %s", e)
        # fallback deterministic vector
        import numpy as np
        arr = np.zeros((1, 256), dtype="float32")
        arr[0, 0] = 1.0
        return {"model": "mock-fallback", "b64": base64.b64encode(arr.tobytes()).decode("ascii"), "shape": list(arr.shape)}


# --- API endpoints ---


@app.post("/v1/process_case", status_code=202)
def process_case(req: ProcessRequest, request: Request, idempotency_key: Optional[str] = Header(None)):
    """
    Accepts a screening case and enqueues a MedGemma job via Celery.
    Returns job_id for polling.
    """
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    logger.info("Received process_case request_id=%s idempotency=%s", request_id, idempotency_key)

    # Idempotency: return existing job if idempotency_key already exists
    if idempotency_key:
        existing = read_job(idempotency_key)
        if existing:
            logger.info("Idempotency key hit -> returning existing job %s", idempotency_key)
            return {"job_id": idempotency_key, "status": existing.get("status"), "poll_url": f"/v1/jobs/{idempotency_key}"}

    # Normalize / generate case_id and clinic mapping
    case_id = req.case_id or new_case_id()
    clinic_id = req.clinic_id or DEFAULT_CLINIC_ID

    # Compute or accept embedding (synchronous)
    emb = get_embedding_or_compute_sync(req)

    # Build structured payload for MedGemma agent
    med_payload = {
        "case_id": case_id,
        "age_months": req.age_months,
        "observations": req.observations,
        "features": {},  # VisionQA can later populate
        "temporal": {},
        "embedding": emb,
        "clinic_id": clinic_id,
        "schema_ver": "v1"
    }

    # Create job record
    job_id = idempotency_key or new_job_id()
    write_job(job_id, {"status": "queued", "case_id": case_id, "clinic_id": clinic_id, "created_at": time.time()})
    append_audit({"type": "job_created", "job_id": job_id, "case_id": case_id, "request_id": request_id, "clinic_id": clinic_id})

    # Enqueue Celery task (worker will update job_store when complete)
    try:
        run_medgemma_pipeline.delay(job_id, med_payload)
    except Exception as e:
        logger.exception("Failed to enqueue Celery task: %s", e)
        write_job(job_id, {"status": "failed", "error": str(e)})
        append_audit({"type": "job_enqueue_failed", "job_id": job_id, "error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to enqueue job")

    return {"job_id": job_id, "status": "queued", "poll_url": f"/v1/jobs/{job_id}"}


@app.get("/v1/jobs/{job_id}")
def job_status(job_id: str):
    j = read_job(job_id)
    if not j:
        raise HTTPException(status_code=404, detail="job not found")
    # normalize result if stored as JSON string in job store
    result = j.get("result")
    if isinstance(result, str):
        try:
            result = json.loads(result)
        except Exception:
            pass
    return {"job_id": job_id, "status": j.get("status"), "result": result, "raw": j}


@app.post("/v1/webhooks/register")
def register_webhook(payload: WebhookRegisterPayload):
    secret = payload.secret or os.urandom(16).hex()
    entry = register_wh(payload.clinic_id, payload.url, secret)
    append_audit({"type": "webhook_registered", "clinic_id": payload.clinic_id, "url": payload.url})
    return {"status": "ok", "entry": entry}


@app.get("/v1/webhooks/{clinic_id}")
def get_webhook(clinic_id: str):
    entry = get_wh(clinic_id)
    if not entry:
        raise HTTPException(status_code=404, detail="webhook not found")
    return entry


@app.post("/v1/case/{case_id}/signoff")
def clinician_signoff(case_id: str, req: SignoffRequest, request: Request):
    """
    Clinician signs off a job. Requires job_id (the job that produced the MedGemma output) and clinician_id.
    Transition job to 'signed_off' and trigger parent delivery (rewrite + simulated delivery).
    """
    job = read_job(req.job_id)
    if not job or job.get("case_id") != case_id:
        raise HTTPException(status_code=404, detail="job not found for given case")

    # Only allow signoff if job in completed or requires_review
    status = job.get("status")
    if status not in ("completed", "requires_review"):
        raise HTTPException(status_code=409, detail=f"job not in signoffable state: {status}")

    # Persist clinician signoff info in job store / audit
    sign_entry = {
        "signed_by": req.clinician_id,
        "signed_at": time.time(),
        "notes": req.notes or ""
    }
    write_job(req.job_id, {"status": "signed_off", "signoff": json.dumps(sign_entry)})
    append_audit({"type": "clinician_signoff", "job_id": req.job_id, "case_id": case_id, "clinician_id": req.clinician_id})

    # Trigger parent delivery (Post-signoff). Use parent_service.rewrite_for_parent
    # Read medgemma result from job
    job_data = read_job(req.job_id)
    raw_result = job_data.get("result")
    if isinstance(raw_result, str):
        try:
            raw_result = json.loads(raw_result)
        except Exception:
            raw_result = None

    medgemma_out = None
    if raw_result:
        if "medgemma" in raw_result:
            medgemma_out = raw_result["medgemma"]
        elif "screening" in raw_result:
            medgemma_out = raw_result["screening"]
        else:
            medgemma_out = raw_result

    if not medgemma_out:
        append_audit({"type": "parent_delivery_failed", "job_id": req.job_id, "reason": "no_medgemma_output"})
        return {"status": "signed_off", "delivery": "skipped_no_medgemma"}

    # Create parent-facing text (Gemma 3 or simple rewrite)
    parent = rewrite_for_parent(medgemma_out)
    # In prod: send via SMS/Email/Portal. Here we simulate delivery and log audit.
    delivery_event = {
        "job_id": req.job_id,
        "case_id": case_id,
        "delivered_to": "parent_contact_demo",  # replace with real contact
        "parent_text": parent,
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    # Mark delivered
    write_job(req.job_id, {"status": "delivered", "delivered_at": time.time(), "delivery_event": json.dumps(delivery_event)})
    append_audit({"type": "parent_delivery", "job_id": req.job_id, "case_id": case_id, "delivery_event": delivery_event})

    return {"status": "signed_off", "delivery_event": delivery_event}


# --- Background poller (runs on startup) ---


async def poll_job_store_loop(stop_event: asyncio.Event):
    """
    Periodically scans job_store for jobs in 'completed' or 'requires_review' and attempts to
    deliver webhooks once (if registered). Uses job_store.read_job + job_store.write_job.
    The Celery worker already updates job_store; this poller ensures webhook delivery if worker didn't.
    """
    logger.info("Starting job_store poller (interval=%s seconds)", POLL_INTERVAL)
    # Attempt to use job_store.list_all / rcli if available
    try:
        import job_store as js
    except ImportError:
        from . import job_store as js

    # determine how to list keys
    list_keys_fn = None
    if hasattr(js, "list_jobs"):
        list_keys_fn = js.list_jobs
    elif hasattr(js, "rcli"):
        def _rk():
            # returns job_ids without 'job:' prefix
            prefix = getattr(js, "JOB_PREFIX", "job:")
            keys = js.rcli.keys(f"{prefix}*")
            return [k[len(prefix):] for k in keys]
        list_keys_fn = _rk
    else:
        logger.warning("job_store does not expose list_jobs or rcli; poller will not run scans.")
        return

    while not stop_event.is_set():
        try:
            job_ids = list_keys_fn()
            for jid in job_ids:
                try:
                    job = read_job(jid)
                    if not job:
                        continue
                    status = job.get("status")
                    notified = job.get("notified")
                    # handle notified being string "True"/"False" from Redis
                    if isinstance(notified, str):
                        notified = notified.lower() == "true"

                    # deliver for completed / requires_review if not already notified
                    if status in ("completed", "requires_review") and not notified:
                        clinic_id = job.get("clinic_id", DEFAULT_CLINIC_ID)
                        wh = get_wh(clinic_id)
                        event = {
                            "event_type": f"job.{status}",
                            "job_id": jid,
                            "case_id": job.get("case_id"),
                            "result": job.get("result"),
                            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                        }
                        if wh:
                            # sign payload
                            try:
                                sig = sign_payload(wh["secret"], event)
                                headers = {"Content-Type": "application/json", "X-PediSig": sig}
                                resp = requests.post(wh["url"], json=event, headers=headers, timeout=6)
                                resp.raise_for_status()
                                # mark notified
                                write_job(jid, {"notified": True, "notified_at": time.time()})
                                append_audit({"type": "webhook_delivered", "job_id": jid, "clinic_id": clinic_id, "webhook_url": wh["url"]})
                                logger.info("Delivered webhook for job %s to clinic %s", jid, clinic_id)
                            except Exception as e:
                                logger.warning("Webhook delivery failed for job %s: %s", jid, e)
                                # do not mark notified; delivery will be retried by poller
                                append_audit({"type": "webhook_delivery_failed", "job_id": jid, "clinic_id": clinic_id, "error": str(e)})
                        else:
                            # no webhook registered; mark as notified=false and record audit
                            append_audit({"type": "no_webhook_registered", "job_id": jid, "clinic_id": clinic_id})
                            write_job(jid, {"notified": False})
                except Exception as e:
                    logger.exception("Error checking job %s in poller: %s", jid, e)
            # sleep before next scan
            await asyncio.sleep(POLL_INTERVAL)
        except Exception as e:
            logger.exception("Poller top-level error: %s", e)
            await asyncio.sleep(POLL_INTERVAL)


@app.on_event("startup")
async def startup_event():
    # start poller background task
    app.state.stop_event = asyncio.Event()
    app.state.poller_task = asyncio.create_task(poll_job_store_loop(app.state.stop_event))
    logger.info("Orchestrator startup complete; poller task started.")


@app.on_event("shutdown")
async def shutdown_event():
    # cancel poller
    if hasattr(app.state, "stop_event"):
        app.state.stop_event.set()
    if hasattr(app.state, "poller_task"):
        await app.state.poller_task
    logger.info("Orchestrator shutdown complete; poller stopped.")


# --- Health check ---
@app.get("/health")
def health():
    return {"ok": True, "poll_interval": POLL_INTERVAL, "host": ORCHESTRATOR_HOST}
