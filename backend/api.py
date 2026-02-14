"""
Unified FastAPI app: /health, /embed, /infer.
Run: uvicorn backend.api:app --host 0.0.0.0 --port 8000
"""
import base64
import hashlib
import json
import os
from datetime import datetime
from pathlib import Path

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile

from backend.audit import append_audit
from backend.embed_server import MODE, MODEL_NAME, compute_embedding
from backend.medgemma_service import FALLBACK_ON_ERROR, MedGemmaService
from backend.schemas import (
    ConsentSchema,
    EmbeddingResponse,
    InferenceRequest,
    InferenceResponse,
    InferenceResult,
)

app = FastAPI(title="PediScreen AI — Embed + Inference API")

# Lazy init MedGemma
_medgemma_svc: MedGemmaService | None = None


def get_medgemma_service() -> MedGemmaService:
    global _medgemma_svc
    if _medgemma_svc is None:
        _medgemma_svc = MedGemmaService()
    return _medgemma_svc


def b64_to_float32_arr(b64: str, shape: tuple) -> np.ndarray:
    raw = base64.b64decode(b64)
    arr = np.frombuffer(raw, dtype=np.float32)
    return arr.reshape(shape)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "mode": MODE,
        "model": MODEL_NAME,
        "embed_mode": os.getenv("EMBED_MODE", "real"),
        "real_mode": os.getenv("REAL_MODE", "true"),
    }


@app.get("/audit_summary")
def audit_summary():
    """Return basic audit counts (total, fallback_used, errors)."""
    from backend.audit import AUDIT_PATH

    total = fallbacks = errors = 0
    if Path(AUDIT_PATH).exists():
        with open(AUDIT_PATH, encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    entry = json.loads(line)
                    total += 1
                    if entry.get("fallback_used"):
                        fallbacks += 1
                    if entry.get("status") == "error":
                        errors += 1
                except json.JSONDecodeError:
                    pass
    return {"total": total, "fallback_used": fallbacks, "errors": errors}


@app.post("/embed")
async def embed(file: UploadFile = File(...)):
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    try:
        b64, shape, emb_version = compute_embedding(contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"bad image: {e}")

    return EmbeddingResponse(
        embedding_b64=b64,
        shape=shape,
        emb_version=emb_version,
    )


@app.get("/adapters")
def list_adapters():
    """List registered adapters from adapters/registry.json."""
    reg_path = Path("adapters/registry.json")
    if not reg_path.exists():
        return {"adapters": []}
    try:
        with open(reg_path) as f:
            data = json.load(f)
        return data
    except Exception:
        return {"adapters": []}


@app.post("/infer")
async def infer(req: InferenceRequest):
    if not req.consent.consent_given:
        raise HTTPException(status_code=403, detail="consent_required")

    try:
        raw = base64.b64decode(req.embedding_b64)
        arr = np.frombuffer(raw, dtype=np.float32).reshape(tuple(req.shape))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Bad embedding: {e}")

    input_hash = hashlib.sha256(raw).hexdigest()
    svc = get_medgemma_service()

    try:
        result = svc.infer(
            observations_text=req.observations,
            embedding_np=arr,
            age_months=req.age_months,
        )
        fallback_used = (
            result.get("model_id") in (None, "fallback")
            or "Fallback heuristic" in (result.get("explain") or "")
        )
        append_audit(
            {
                "ts": datetime.utcnow().isoformat() + "Z",
                "case_id": req.case_id,
                "adapter_id": req.adapter_id,
                "model_id": result.get("model_id", ""),
                "input_hash": input_hash,
                "fallback_used": bool(fallback_used),
                "status": "ok",
            }
        )
    except Exception as e:
        append_audit(
            {
                "ts": datetime.utcnow().isoformat() + "Z",
                "case_id": req.case_id,
                "adapter_id": req.adapter_id,
                "model_id": "",
                "input_hash": input_hash,
                "fallback_used": True,
                "status": "error",
                "error": str(e),
            }
        )
        if FALLBACK_ON_ERROR:
            result = svc._fallback_inference(req.observations, req.age_months)
            fallback_used = True
        else:
            raise HTTPException(status_code=500, detail=str(e))

    summary = result.get("summary", result.get("keyFindings", []))
    if isinstance(summary, str):
        summary = [summary]

    inf_result = InferenceResult(
        summary=summary,
        risk=result.get("risk", result.get("riskLevel", "monitor")),
        recommendations=result.get("recommendations", []),
        parent_text=result.get("parent_text", result.get("clinical_summary")),
        explain=result.get("explain"),
        confidence=result.get("confidence", 0.5),
        adapter_id=result.get("adapter_id"),
        model_id=result.get("model_id"),
        raw_text=result.get("raw_text"),
    )

    return InferenceResponse(
        case_id=req.case_id,
        result=inf_result,
        fallback_used=fallback_used,
        inference_ts=datetime.utcnow().isoformat() + "Z",
    )
