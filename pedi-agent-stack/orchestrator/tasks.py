import os
import json
import time
from loguru import logger
from celery_app import celery
import requests
import redis

from webhooks import deliver_webhook

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
rcli = redis.from_url(REDIS_URL, decode_responses=True)

MEDGEMMA_URL = os.getenv("MEDGEMMA_URL", "http://medgemma-llm:8000/infer")
SAFETY_URL = os.getenv("SAFETY_URL", "")  # optional external safety service


def _set_job_status(job_id: str, status: str, payload: dict = None):
    key = f"job:{job_id}"
    entry = {"status": status, "updated_at": str(time.time())}
    if payload is not None:
        entry["result"] = json.dumps(payload)
    rcli.hset(key, mapping=entry)
    rcli.expire(key, 60 * 60 * 24 * 7)  # keep for 7 days


@celery.task(bind=True, name="run_medgemma_pipeline", acks_late=True)
def run_medgemma_pipeline(self, job_id: str, med_payload: dict):
    """
    Worker task: call MedGemma, run safety checks (internal or external),
    write results / status into Redis job store, and deliver webhook on completion.
    """
    try:
        _set_job_status(job_id, "running")
        # 1) call medgemma
        resp = requests.post(MEDGEMMA_URL, json=med_payload, timeout=30)
        resp.raise_for_status()
        med_out = resp.json()
        # 2) safety checks (local optional)
        safety_ok = True
        safety_reasons = []
        if SAFETY_URL:
            s = requests.post(
                SAFETY_URL,
                json={"medgemma": med_out, "observations": med_payload.get("observations", "")},
                timeout=12,
            )
            s.raise_for_status()
            sjson = s.json()
            safety_ok = sjson.get("ok", False)
            safety_reasons = sjson.get("reasons", [])
        else:
            # lightweight local check (banned words + confidence)
            text = " ".join(
                (med_out.get("summary") or []) + [med_out.get("rationale", "") or ""]
            )
            banned = ["diagnose", "definitely", "will", "100%"]
            for b in banned:
                if b in text.lower():
                    safety_ok = False
                    safety_reasons.append(f"banned:{b}")
            if med_out.get("confidence", 1.0) < 0.5:
                safety_ok = False
                safety_reasons.append("low_confidence")

        # Save combined output
        result = {"medgemma": med_out, "safety_ok": safety_ok, "safety_reasons": safety_reasons}
        final_status = "completed" if safety_ok else "requires_review"
        _set_job_status(job_id, final_status, result)

        # 3) Deliver webhook on completion (if clinic_id registered)
        clinic_id = med_payload.get("clinic_id")
        if clinic_id:
            event = {
                "job_id": job_id,
                "case_id": med_payload.get("case_id"),
                "status": final_status,
                "result": result,
            }
            deliver_webhook(clinic_id, event)

        return result
    except Exception as e:
        logger.exception("Task failed: %s", e)
        _set_job_status(job_id, "failed", {"error": str(e)})
        raise
