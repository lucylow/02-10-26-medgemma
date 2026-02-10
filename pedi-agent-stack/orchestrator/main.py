import os, uuid, requests
from fastapi import FastAPI, HTTPException, APIRouter
from pydantic import BaseModel
from loguru import logger

from tasks import run_medgemma_pipeline
from job_store import write_job, read_job
from webhooks import register_webhook, get_webhook, sign_payload

app = FastAPI(title="PediScreen Orchestrator")

EMBED_SERVER_URL = os.getenv("EMBED_SERVER_URL", "http://localhost:5000/embed")
MEDGEMMA_URL = os.getenv("MEDGEMMA_URL", "http://localhost:8000/infer")

class ProcessReq(BaseModel):
    case_id: str
    age_months: int
    observations: str

@app.post("/process")
async def process(req: ProcessReq):
    logger.info("Processing case {}", req.case_id)
    
    job_id = str(uuid.uuid4())
    write_job(job_id, {"status": "queued", "case_id": req.case_id})
    
    med_payload = {
        "age_months": req.age_months,
        "observations": req.observations,
        "features": {},
        "temporal": {}
    }
    
    # submit Celery task
    run_medgemma_pipeline.delay(job_id, med_payload)
    
    return {
        "job_id": job_id,
        "status": "queued",
        "poll_url": f"/v1/jobs/{job_id}"
    }

@app.get("/v1/jobs/{job_id}")
async def get_job(job_id: str):
    job = read_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

# Webhooks router
webhook_router = APIRouter()

@webhook_router.post("/v1/webhooks/register")
def register(payload: dict):
    clinic_id = payload.get("clinic_id")
    url = payload.get("url")
    # secret can be provided or generated (we recommend generated server-side)
    secret = payload.get("secret") or os.urandom(16).hex()
    if not clinic_id or not url:
        raise HTTPException(400, "clinic_id and url required")
    entry = register_webhook(clinic_id, url, secret)
    return {"status": "ok", "clinic_id": clinic_id, "url": url, "secret": secret}

def deliver_webhook(clinic_id: str, event: dict):
    wh = get_webhook(clinic_id)
    if not wh:
        return False
    url = wh["url"]
    secret = wh["secret"]
    sig = sign_payload(secret, event)
    headers = {"Content-Type": "application/json", "X-PediSig": sig}
    try:
        r = requests.post(url, json=event, headers=headers, timeout=6)
        r.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Webhook delivery failed: {e}")
        return False

app.include_router(webhook_router)

@app.get("/health")
def health():
    return {"status": "ok"}
