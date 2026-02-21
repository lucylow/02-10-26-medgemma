# model-dev/deploy/modelserver/app/main.py
"""
FastAPI inference server exposing endpoints for:
- /health
- /info
- /infer_embedding  (accepts precomputed image embedding base64 + shape)
- /infer_text       (text-only path)
- /metrics (optional / basic)

This is a minimal but robust skeleton for local/dev testing or to extend for production:
- strong input validation with Pydantic
- careful error handling and logging
- simple provenance fields in responses
"""

from __future__ import annotations

import base64
import json
import logging
import os
import sys
from pathlib import Path
from typing import List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, constr

# Ensure app dir is on path so "from medgemma_service import ..." works from any cwd
_APP_DIR = Path(__file__).resolve().parent
if str(_APP_DIR) not in sys.path:
    sys.path.insert(0, str(_APP_DIR))

from medgemma_service import MedGemmaService

logger = logging.getLogger("modelserver")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    )
    logger.addHandler(ch)

# Config from env
MODEL_PATH = os.environ.get("MEDGEMMA_MODEL_PATH", None)
PEFT_ADAPTER = os.environ.get("PEFT_ADAPTER_PATH", None)
DEVICE = os.environ.get("MODEL_DEVICE", None)  # e.g., "cuda" or "cpu"
MAX_PAYLOAD_BYTES = int(
    os.environ.get("MAX_PAYLOAD_BYTES", "2_000_000")
)  # 2MB default guard

# Instantiate service (lazy load inside)
service = MedGemmaService(
    model_name=MODEL_PATH, device=DEVICE, use_peft_adapter=PEFT_ADAPTER
)

app = FastAPI(title="PediScreen MedGemma Model Server")


class InferEmbeddingRequest(BaseModel):
    case_id: Optional[str] = Field(
        None, description="Optional case identifier (pseudonymized preferred)"
    )
    age_months: Optional[int] = Field(
        None, description="Child age in months"
    )
    observations: Optional[str] = Field(
        None, description="Optional caregiver / CHW textual observations"
    )
    embedding_b64: constr(min_length=1) = Field(
        ..., description="Base64-encoded float32 bytes of embedding"
    )
    shape: List[int] = Field(
        ...,
        description="Shape of the embedding array (e.g. [1,256] or [1,1,256])",
    )
    max_new_tokens: Optional[int] = 256
    temperature: Optional[float] = 0.0


class InferTextRequest(BaseModel):
    case_id: Optional[str] = None
    age_months: Optional[int] = None
    observations: Optional[str] = None
    max_new_tokens: Optional[int] = 256
    temperature: Optional[float] = 0.0


@app.on_event("startup")
def startup_event():
    # Optionally trigger model load to warm pools / reduce first-call latency.
    try:
        logger.info("Startup: attempting to warm model (non-blocking load).")
        service.load_model()
    except Exception as e:
        logger.exception("Startup load failed (non-fatal): %s", e)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": service.loaded,
        "model_version": service.model_name,
    }


@app.get("/info")
def info():
    return {
        "service": "PediScreen MedGemma Model Server",
        "model_version": service.model_name,
        "device": str(service.device),
        "peft_adapter": service.adapter,
    }


@app.post("/infer_embedding")
def infer_embedding(req: InferEmbeddingRequest):
    # Validate payload size conservatively (prevent very large base64 blobs)
    raw_len = len(req.embedding_b64)
    if raw_len > MAX_PAYLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Payload too large")

    try:
        # decode base64 -> numpy float32
        raw = base64.b64decode(req.embedding_b64)
        emb = np.frombuffer(raw, dtype=np.float32)
        try:
            emb = emb.reshape(tuple(req.shape))
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"shape mismatch or invalid shape: {e}"
            )

        # call service
        result = service.infer(
            precomputed_image_emb=emb,
            age_months=req.age_months,
            observations=req.observations,
            max_new_tokens=req.max_new_tokens or 256,
            temperature=req.temperature or 0.0,
        )

        return {"success": True, "case_id": req.case_id, "result": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in /infer_embedding: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/infer_text")
def infer_text(req: InferTextRequest):
    try:
        result = service.infer(
            precomputed_image_emb=None,
            age_months=req.age_months,
            observations=req.observations,
            max_new_tokens=req.max_new_tokens or 256,
            temperature=req.temperature or 0.0,
        )
        return {"success": True, "case_id": req.case_id, "result": result}
    except Exception as e:
        logger.exception("Error in /infer_text: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception for request %s: %s", request.url, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Unexpected server error"},
    )


# Optional minimal health & readiness probe endpoints for k8s
@app.get("/ready")
def ready():
    # ready if model loaded (or if in fallback mode we still return ready=True)
    return {"ready": True, "model_loaded": service.loaded}


# For quick local debugging you can run:
# From repo root:  uvicorn app.main:app --app-dir model-dev/deploy/modelserver --host 0.0.0.0 --port 8000 --reload
# From app dir:   cd model-dev/deploy/modelserver/app && uvicorn main:app --host 0.0.0.0 --port 8000 --reload
