"""
Orchestrator: multi-agent pipeline for /process/case.
Flow: Intake → Embedding → Temporal → MedGemma → Safety → Response.
"""
import asyncio
import base64
import logging
import os
import sys
from datetime import datetime
from pathlib import Path

# Add backend to path when orchestrator runs standalone
_backend = Path(__file__).resolve().parents[1] / "backend"
if _backend.exists() and str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from orchestrator.agents.embedding_agent import run_embedding
from orchestrator.agents.temporal_agent import run_temporal, store_embedding
from orchestrator.agents.medgemma_agent import run_medgemma
from orchestrator.agents.safety_agent import run_safety_check
from orchestrator.schemas import (
    ProcessCaseRequest,
    ProcessCaseResponse,
    ScreeningResultBlock,
    EmbeddingMetadata,
    TemporalAnalysis,
    SafetyStatus,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("orchestrator")

app = FastAPI(title="PediScreen Orchestrator", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def _intake_normalize(req: ProcessCaseRequest) -> ProcessCaseRequest:
    """Intake Agent: validate payload, normalize text."""
    req.observations = (req.observations or "").strip()
    req.observations = req.observations.replace("\u201c", '"').replace("\u201d", '"')
    if len(req.observations) < 10:
        raise HTTPException(422, "observations must be at least 10 characters")
    return req


@app.post("/process/case", response_model=ProcessCaseResponse)
async def process_case(req: ProcessCaseRequest):
    """
    Full pipeline: Intake → Embedding → Temporal → MedGemma → Safety.
    Returns ProcessCaseResponse with screening_result, embedding_metadata, temporal_analysis, safety_status.
    """
    # 1. Intake
    req = _intake_normalize(req)

    # 2. Embedding Agent
    embedding, emb_model, emb_shape = run_embedding(req.image_b64)
    emb_b64 = None
    if embedding:
        import struct
        b = struct.pack(f"{len(embedding)}f", *embedding)
        emb_b64 = base64.b64encode(b).decode("ascii")
        store_embedding(req.case_id, embedding)

    # 3. Temporal Agent
    stability, cos_dist, hist_count = run_temporal(req.case_id, embedding)
    temporal = TemporalAnalysis(
        stability=stability,
        cosine_distance=cos_dist,
        history_count=hist_count,
    )

    # 4. MedGemma Agent
    medgemma_out = await run_medgemma(
        case_id=req.case_id,
        child_age_months=req.child_age_months,
        domain=req.domain,
        observations=req.observations,
        image_b64=req.image_b64,
        role=req.role,
    )

    # 5. Safety Agent (output already passed through backend safety; re-check for orchestrator-only flow)
    ok, action, reasons = run_safety_check(
        medgemma_out.get("clinician_summary", ""),
        medgemma_out.get("parent_summary", ""),
        medgemma_out.get("rationale", []),
        medgemma_out.get("risk_level", "monitor"),
        medgemma_out.get("confidence", 0.5),
    )
    safety = SafetyStatus(ok=ok, action=action, reasons=reasons)

    # Build response
    gen_at = medgemma_out.get("generated_at")
    if isinstance(gen_at, str):
        try:
            gen_at = datetime.fromisoformat(gen_at.replace("Z", "+00:00"))
        except Exception:
            gen_at = datetime.utcnow()
    elif not gen_at:
        gen_at = datetime.utcnow()

    screening = ScreeningResultBlock(
        risk_level=medgemma_out.get("risk_level", "monitor"),
        confidence=float(medgemma_out.get("confidence", 0.5)),
        clinician_summary=medgemma_out.get("clinician_summary", ""),
        parent_summary=medgemma_out.get("parent_summary", ""),
        rationale=medgemma_out.get("rationale", []),
        recommendations=medgemma_out.get("recommendations", []),
        developmental_scores=medgemma_out.get("developmental_scores", {}),
        model_id=medgemma_out.get("model_id", "unknown"),
        adapter_id=medgemma_out.get("adapter_id", ""),
        prompt_version=medgemma_out.get("prompt_version", "v1"),
        generated_at=gen_at,
    )

    return ProcessCaseResponse(
        screening_result=screening,
        embedding_metadata=EmbeddingMetadata(
            model=emb_model,
            shape=emb_shape,
            embedding_b64=emb_b64,
        ),
        temporal_analysis=temporal,
        safety_status=safety,
    )


@app.get("/health")
def health():
    return {"ok": True, "service": "orchestrator"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("ORCHESTRATOR_PORT", "7000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
