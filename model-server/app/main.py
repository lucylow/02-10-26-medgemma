# app/main.py
import json
import os
import traceback
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from .medgemma_service import MedGemmaService
from .utils.embeddings import parse_embedding_b64

# instantiate app
app = FastAPI(title="PediScreen Model Server (MedGemma inference)")

# load the model service on startup
MODEL_PATH = os.environ.get("MEDGEMMA_MODEL_PATH", "google/medgemma-2b-it")
_service = None

@app.on_event("startup")
def startup_event():
    global _service
    _service = MedGemmaService(model_name=MODEL_PATH)
    print("[startup] MedGemmaService initialized")

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_PATH}


@app.get("/status")
def status():
    """Return device, model, ready state (for monitoring)."""
    return _service.get_status()


@app.get("/warmup")
def warmup():
    """Run small inference to verify model is ready (liveness check)."""
    return _service.warmup()

class InferRequest(BaseModel):
    case_id: Optional[str] = None
    age_months: int
    observations: str
    embedding_b64: Optional[str] = None   # base64 of float32 bytes
    shape: Optional[List[int]] = None     # e.g. [1, 256]
    max_new_tokens: Optional[int] = 256
    temperature: Optional[float] = 0.0

@app.post("/infer_embedding")
def infer_embedding(req: InferRequest):
    try:
        if req.embedding_b64 is None:
            raise HTTPException(status_code=400, detail="embedding_b64 is required (precomputed embedding)")

        if req.shape is None:
            raise HTTPException(status_code=400, detail="shape is required (e.g., [1,256])")

        # decode base64 -> numpy float32 array (validates byte length vs shape)
        try:
            emb = parse_embedding_b64(req.embedding_b64, req.shape)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # call model service
        result = _service.infer(precomputed_image_emb=emb,
                                age_months=req.age_months,
                                observations=req.observations,
                                max_new_tokens=req.max_new_tokens or 256,
                                temperature=req.temperature or 0.0)
        return {"success": True, "case_id": req.case_id, "result": result}
    except HTTPException as e:
        raise e
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
