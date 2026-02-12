# orchestrator/main.py
import os
import uuid
import base64
import time
from typing import Optional
from fastapi import FastAPI, Request, HTTPException, Header
from pydantic import BaseModel
from loguru import logger

# local modules (make sure these exist in orchestrator/)
from job_store import write_job, read_job
from tasks import run_medgemma_pipeline
from webhooks import register_webhook as register_wh, get_webhook as get_wh
from embedding_service import compute_embedding  # returns {"model","shape","b64"} or raises

# Config
EMBED_SERVER_URL = os.getenv("EMBED_SERVER_URL", "http://embed-server:5000/embed")
MEDGEMMA_URL = os.getenv("MEDGEMMA_URL", "http://medgemma-llm:8000/infer")
ORCHESTRATOR_HOST = os.getenv("ORCHESTRATOR_HOST", "http://orchestrator:7000")

app = FastAPI(title="PediScreen Orchestrator (Celery + Webhooks)")

# ---- Schemas (lightweight inline for this file)
class ProcessRequest(BaseModel):
    case_id: Optional[str] = None
    clinic_id: Optional[str] = None
    age_months: int = 0
    observations: Optional[str] = ""
    # client may optionally provide an embedding (b64 + shape)
    embedding_b64: Optional[str] = None
    embedding_shape: Optional[list] = None
    image_path: Optional[str] = None  # dev local file path - in production use signed URL

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    result: Optional[dict] = None

# Helper: create case id
def new_case_id():
    return str(uuid.uuid4())

# Helper: create job id
def new_job_id():
    return str(uuid.uuid4())

# Helper: do a quick synchronous embedding (or accept client-provided)
def get_embedding_or_compute(req: ProcessRequest):
    if req.embedding_b64 and req.embedding_shape:
        return {"model": "client-provided", "b64": req.embedding_b64, "shape": req.embedding_shape}
    # else try to compute server-side from image_path (dev) or call embed server
    try:
        emb = compute_embedding(image_path=req.image_path, image_b64=None)
        return emb
    except Exception as e:
        logger.warning("Embedding compute failed: %s", e)
        # fallback to zero-vector
        import numpy as np
        arr = np.zeros((1, 256), dtype="float32")
        arr[0, 0] = 1.0
        return {"model": "mock-fallback", "b64": base64.b64encode(arr.tobytes()).decode("ascii"), "shape": list(arr.shape)}


@app.post("/v1/process_case", status_code=202)
def process_case(req: ProcessRequest, request: Request, idempotency_key: Optional[str] = Header(None)):
    """
    Accepts a screening case, computes/accepts embedding, enqueues a MedGemma job via Celery,
    and returns a job_id to poll for status.
    """
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    logger.info("Process request_id=%s idempotency=%s", request_id, idempotency_key)

    # Idempotency: if key provided and job exists, return it
    if idempotency_key:
        existing = read_job(idempotency_key)
        if existing:
            return {"job_id": idempotency_key, "status": existing.get("status"), "poll_url": f"/v1/jobs/{idempotency_key}"}

    # Normalize/generate case_id
    case_id = req.case_id or new_case_id()

    # 1) Get embedding (sync or client-provided)
    emb = get_embedding_or_compute(req)

    # 2) Build MedGemma payload (structured)
    med_payload = {
        "case_id": case_id,
        "clinic_id": req.clinic_id,
        "age_months": req.age_months,
        "observations": req.observations or "",
        "features": {},   # VisionQA would populate in a fuller pipeline
        "temporal": {},   # Temporal agent could precompute if desired
        "embedding": emb,
        "schema_ver": "v1"
    }

    # 3) Create job record in job store (Redis)
    job_id = idempotency_key or new_job_id()
    write_job(job_id, {"status": "queued", "case_id": case_id, "created_at": time.time()})

    # 4) Enqueue Celery task (worker will run MedGemma + safety and update job store)
    try:
        run_medgemma_pipeline.delay(job_id, med_payload)
    except Exception as e:
        logger.exception("Failed to enqueue Celery task: %s", e)
        write_job(job_id, {"status": "failed", "error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to enqueue job")

    # 5) Return job id + poll url
    return {"job_id": job_id, "status": "queued", "poll_url": f"/v1/jobs/{job_id}"}


# Legacy /process for clinician UI compatibility
class LegacyProcessReq(BaseModel):
    case_id: str
    age_months: int
    observations: str


@app.post("/process", status_code=202)
def process_legacy(req: LegacyProcessReq, request: Request):
    """Legacy endpoint - maps to /v1/process_case."""
    return process_case(
        ProcessRequest(case_id=req.case_id, age_months=req.age_months, observations=req.observations),
        request,
        None,
    )


@app.get("/v1/jobs/{job_id}", response_model=JobStatusResponse)
def job_status(job_id: str):
    j = read_job(job_id)
    if not j:
        raise HTTPException(status_code=404, detail="job not found")
    return JobStatusResponse(job_id=job_id, status=j.get("status", "unknown"), result=j.get("result"))

# Webhook registration (clinic registers webhook URL + secret)
class WebhookRegisterPayload(BaseModel):
    clinic_id: str
    url: str
    secret: Optional[str] = None


@app.post("/v1/webhooks/register")
def register_webhook(payload: WebhookRegisterPayload):
    secret = payload.secret or os.urandom(16).hex()
    entry = register_wh(payload.clinic_id, payload.url, secret)
    return {"status": "ok", "entry": entry}


# Debug endpoint: list webhook (clinic can inspect)
@app.get("/v1/webhooks/{clinic_id}")
def get_webhook(clinic_id: str):
    entry = get_wh(clinic_id)
    if not entry:
        raise HTTPException(status_code=404, detail="webhook not found")
    return entry

# Health check
@app.get("/health")
def health():
    return {"ok": True, "embed": EMBED_SERVER_URL, "medgemma": MEDGEMMA_URL}
