"""
PediScreen MedGemma Inference Server

FastAPI server exposing MedGemma inference endpoints for developmental screening.
"""

import os
import uuid
import json
from datetime import datetime
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import uvicorn

from .schemas import (
    InferRequest,
    InferResponse,
    HealthResponse,
    AdapterUpdateRequest,
    CommunicationRequest,
    CommunicationResponse,
    JobStatus,
    AuditLogEntry,
    ClinicalSignOffRequest,
    JobResponse,
    AsyncJobStatus
)
from .medgemma_service import MedGemmaService
from .medsiglip_service import MedSigLIPService
from .medblip_service import MedBLIPService
from .gemma3_service import Gemma3Service
from .utils.embeddings import base64_to_numpy
from .utils.privacy import decrypt_embedding
from .adapter_manager import ensure_adapter
from .job_store import write_job, read_job
from .tasks import run_medgemma_pipeline

# Configuration from environment
MODEL_NAME = os.getenv("MEDGEMMA_MODEL_NAME", "google/medgemma-2b-it")
ADAPTER_SOURCE = os.getenv("ADAPTER_SOURCE", "")
ADAPTER_LOCAL_DIR = os.getenv("ADAPTER_LOCAL_DIR", "/app/adapters")

# Initialize FastAPI app
app = FastAPI(
    title="PediScreen MedGemma API",
    description="AI-powered pediatric developmental screening using MedGemma",
    version="1.0.0"
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MedGemma service
medgemma_service = MedGemmaService(
    model_name=MODEL_NAME,
    adapter_dir=ADAPTER_LOCAL_DIR
)

# Initialize MedSigLIP service
medsiglip_service = MedSigLIPService()

# Initialize MedBLIP service (optional, enabled via env)
MEDBLIP_ENABLED = os.getenv("MEDBLIP_ENABLED", "0") == "1"
medblip_service = None
if MEDBLIP_ENABLED:
    try:
        medblip_service = MedBLIPService()
    except Exception as e:
        logger.warning("Failed to initialize MedBLIP service: {}", e)

# Initialize Gemma 3 service
GEMMA3_ENABLED = os.getenv("GEMMA3_ENABLED", "1") == "1"
gemma3_service = None
if GEMMA3_ENABLED:
    try:
        gemma3_service = Gemma3Service()
    except Exception as e:
        logger.warning("Failed to initialize Gemma 3 service: {}", e)

# Privacy / Encryption configuration
SERVER_PRIVATE_KEY_B64 = os.getenv("SERVER_PRIVATE_KEY_B64")
if not SERVER_PRIVATE_KEY_B64:
    logger.warning("SERVER_PRIVATE_KEY_B64 not set. Encrypted inference will be disabled.")


# --- HITL State Management (In-Memory Mock) ---
# In a production system, this would be a database (PostgreSQL/Redis)
screening_db = {}


def _get_audit_timestamp():
    return datetime.utcnow().isoformat() + "Z"


# --- GLOBAL EXCEPTION HANDLER ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all exception handler to ensure consistent error responses.
    """
    logger.exception("Unhandled exception occurred")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Internal Server Error",
            "detail": str(exc),
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Custom handler for HTTPExceptions.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


def _fetch_and_attach_adapter(adapter_source: str):
    """Background task to fetch and attach adapter"""
    logger.info("Fetching adapter from: {}", adapter_source)
    try:
        local_dir = ensure_adapter(adapter_source, ADAPTER_LOCAL_DIR)
        medgemma_service.reload_adapter(local_dir)
        logger.info("Adapter loaded successfully from {}", adapter_source)
    except Exception as e:
        logger.exception("Failed to fetch/attach adapter: %s", e)


# Load adapter on startup if configured
if ADAPTER_SOURCE:
    try:
        _fetch_and_attach_adapter(ADAPTER_SOURCE)
    except Exception as e:
        logger.warning("Adapter attach at startup failed: %s", e)


@app.get("/health", response_model=HealthResponse)
def health():
    """Enhanced health check endpoint"""
    model_ok = medgemma_service.model is not None
    tokenizer_ok = medgemma_service.tokenizer is not None
    
    adapter_loaded = (
        bool(medgemma_service.adapter_dir) and
        os.path.exists(medgemma_service.adapter_dir) and
        len(os.listdir(medgemma_service.adapter_dir)) > 0
    )
    
    ok = model_ok and tokenizer_ok
    
    capabilities = ["text_analysis", "structured_reports"]
    if medsiglip_service:
        capabilities.append("vision_analysis")
    if gemma3_service:
        capabilities.append("communication_orchestration")
    
    return HealthResponse(
        ok=ok,
        model=medgemma_service.model_name,
        adapter_loaded=adapter_loaded,
        device=str(medgemma_service.device),
        capabilities=capabilities
    )


@app.post("/api/medblip/analyze")
async def medblip_analyze(req: InferRequest):
    """
    Analyze image using MedBLIP.
    """
    if not medblip_service:
        raise HTTPException(status_code=503, detail="MedBLIP service not enabled or failed to initialize")
    
    if not req.image_b64:
        raise HTTPException(status_code=400, detail="image_b64 is required for MedBLIP analysis")
    
    try:
        result = medblip_service.analyze_clinical_features(req.image_b64)
        return result
    except Exception as e:
        logger.exception("MedBLIP analysis failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/sync_case", response_model=InferResponse)
@app.post("/api/analyze", response_model=InferResponse)
@app.post("/analyze", response_model=InferResponse)
async def analyze(req: InferRequest):
    """
    Analyze developmental screening data.
    
    Accepts text observations and optional raw images or precomputed image embeddings.
    Returns structured risk assessment and recommendations.
    """
    if medgemma_service.model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MedGemma model is not loaded. Check server health."
        )

    try:
        # Handle raw image via MedSigLIP if provided
        visual_evidence_desc = req.visual_evidence_description
        embedding = None
        
        if req.image_b64:
            logger.info("Processing raw image via MedSigLIP")
            
            # Define clinical prompts based on the domain to leverage zero-shot capabilities
            clinical_prompts = []
            if req.domain == "fine_motor":
                clinical_prompts = [
                    "A developmentally typical drawing for a child showing circular shapes and attempted lines",
                    "A primitive scribble with poor pencil control",
                    "Intentional mark making with consistent pressure",
                    "Advanced geometric shapes and complex figure drawing"
                ]
            elif req.domain == "gross_motor":
                clinical_prompts = [
                    "A child walking with steady balance and coordination",
                    "A child struggling to maintain balance while standing",
                    "Symmetrical limb movement and age-appropriate posture",
                    "Signs of motor delay or asymmetrical movement"
                ]

            try:
                analysis = medsiglip_service.analyze_clinical_features(req.image_b64, clinical_prompts=clinical_prompts)
                embedding = analysis["embeddings"]
                # If no manual description provided, use the one from MedSigLIP
                if not visual_evidence_desc:
                    visual_evidence_desc = analysis["visual_description"]
                logger.info("MedSigLIP analysis complete")
            except Exception as e:
                logger.error("MedSigLIP processing failed: {}", e)
                # We can continue without image analysis if it's not strictly required,
                # but let's at least log it and maybe fall back.
                # For now, if image was provided but failed, we might want to inform the user.
                # raise HTTPException(status_code=422, detail=f"Image processing failed: {str(e)}")

        # Parse precomputed embedding if provided and not already set by raw image
        if not embedding and req.embedding_b64 and req.shape:
            try:
                embedding = base64_to_numpy(req.embedding_b64, tuple(req.shape))
            except Exception as e:
                logger.warning("Failed to parse embedding: %s", e)
                raise HTTPException(status_code=400, detail=f"Invalid embedding data: {str(e)}")
        
        # Handle encrypted embedding if provided
        if not embedding and req.encrypted_embedding and req.shape:
            if not SERVER_PRIVATE_KEY_B64:
                raise HTTPException(status_code=503, detail="Server encryption not configured")
            try:
                logger.info("Decrypting client-side encrypted embedding")
                embedding = decrypt_embedding(req.encrypted_embedding, SERVER_PRIVATE_KEY_B64)
                embedding = embedding.reshape(tuple(req.shape))
            except Exception as e:
                logger.error("Failed to decrypt embedding: %s", e)
                raise HTTPException(status_code=400, detail=f"Failed to decrypt embedding: {str(e)}")
        
        # Run inference
        try:
            result = medgemma_service.infer(
                precomputed_image_emb=embedding,
                age_months=req.age_months,
                observations=req.observations,
                domain=req.domain,
                max_new_tokens=req.max_new_tokens or 512,
                temperature=req.temperature or 0.1,
                questionnaire_scores=req.questionnaire_scores.dict() if req.questionnaire_scores else None,
                visual_evidence=visual_evidence_desc
            )
        except Exception as e:
            logger.exception("MedGemma inference failed")
            # Return a controlled error response instead of crashing
            return InferResponse(
                success=False,
                error=f"Inference failed: {str(e)}",
                screening_id=f"error_{uuid.uuid4().hex[:8]}",
                timestamp=datetime.utcnow().isoformat() + "Z"
            )
        
        # Parse JSON result if available
        parsed = result.get("json", {})
        if not parsed and not result.get("text"):
             raise HTTPException(status_code=500, detail="Model returned empty response")
        
        # --- GEMMA 3 INTEGRATION ---
        # If Gemma 3 is enabled and requested, use it to enhance the report
        if gemma3_service and req.use_gemma3_for_communication:
            logger.info("Using Gemma 3 for communication layer")
            comm_params = req.communication_params or {}
            
            # 1. Rewrite parent-friendly explanation (Use Case 3.1 & 3.3)
            clinical_summary = parsed.get("clinical_summary", "")
            if clinical_summary:
                try:
                    gemma3_explanation = gemma3_service.rewrite_for_parents(
                        clinical_summary=clinical_summary,
                        tone=comm_params.get("tone", "reassuring"),
                        language=comm_params.get("language", "English"),
                        reading_level=comm_params.get("reading_level", "grade 6")
                    )
                    parsed["parent_friendly_explanation"] = gemma3_explanation
                    logger.info("Gemma 3 rewritten explanation successfully")
                except Exception as e:
                    logger.error("Gemma 3 rewrite failed: {}", e)
        # ---------------------------

        # Build response
        screening_id = req.case_id or f"screen_{uuid.uuid4().hex[:12]}"
        timestamp = datetime.utcnow().isoformat() + "Z"
        
        # HITL Audit Log initialization
        audit_log = [
            AuditLogEntry(
                timestamp=_get_audit_timestamp(),
                action="INITIAL_SCREENING",
                actor="system",
                details="AI generated initial developmental screening report",
                new_state=JobStatus.REQUIRES_REVIEW
            )
        ]
        
        # Map risk levels to legacy/frontend format if needed
        # In the new prompt, risk level is Low/Moderate/Elevated
        # The schema expected on_track/monitor/refer
        risk_map = {
            "low": "on_track",
            "moderate": "monitor",
            "elevated": "refer"
        }
        
        raw_risk = parsed.get("risk_stratification", {}).get("level", "unknown")
        mapped_risk = risk_map.get(raw_risk.lower(), raw_risk)
        
        # Build the structured report object
        report = None
        if parsed:
            report = parsed
            # Add dynamic impact statement if missing or generic
            if not report.get("economic_impact") or not report["economic_impact"].get("early_intervention_value"):
                risk_level = report.get("risk_stratification", {}).get("level", "low").lower()
                if risk_level in ["moderate", "elevated"]:
                    report["economic_impact"] = {
                        "early_intervention_value": "$30,000 to $100,000",
                        "description": "Early identification and intervention for developmental delays can save up to $100,000 in lifetime costs per child by reducing the need for intensive special education and improving long-term productivity."
                    }
                else:
                    report["economic_impact"] = {
                        "early_intervention_value": "Long-term wellness",
                        "description": "Timely screening confirms typical development, reducing parental anxiety and preventing unnecessary specialist referrals, optimizing healthcare resources."
                    }
        
        response = InferResponse(
            success=True,
            case_id=req.case_id,
            screening_id=screening_id,
            timestamp=timestamp,
            status=JobStatus.REQUIRES_REVIEW,
            report=report,
            audit_log=audit_log,
            risk_assessment={
                "level": mapped_risk,
                "confidence": parsed.get("risk_stratification", {}).get("confidence", 0.5),
                "reasoning": parsed.get("risk_stratification", {}).get("rationale", "")
            },
            developmental_analysis=parsed.get("developmental_profile", {}),
            clinical_summary=parsed.get("clinical_summary", result.get("text", "")),
            recommendations=parsed.get("recommendations", {}),
            referral_guidance=parsed.get("referral_guidance", {}),
            inference_metadata={
                "model": result.get("model"),
                "inference_time_s": result.get("inference_time_s"),
                "fallback_to_text_only": result.get("fallback_to_text_only", False),
                "adapter_path": result.get("adapter_path")
            },
            evidence_grounding=parsed.get("supporting_evidence", {})
        )
        
        # Persist to "DB"
        screening_db[screening_id] = response
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Inference failed: %s", e)
        return InferResponse(
            success=False,
            error=str(e),
            screening_id=f"error_{uuid.uuid4().hex[:8]}",
            timestamp=datetime.utcnow().isoformat() + "Z"
        )


@app.post("/infer", response_model=InferResponse)
async def infer_legacy(req: InferRequest):
    """Legacy inference endpoint - redirects to /analyze"""
    return await analyze(req)


@app.post("/api/communication", response_model=CommunicationResponse)
async def communication_task(req: CommunicationRequest):
    """
    Execute Gemma 3 communication and orchestration tasks.
    (Explanation rewriting, Clinician note formatting, Dynamic follow-up)
    """
    if not gemma3_service:
        raise HTTPException(status_code=503, detail="Gemma 3 service not available")
    
    try:
        output = None
        if req.task == "rewrite_for_parents":
            params = req.params or {}
            output = gemma3_service.rewrite_for_parents(
                clinical_summary=req.clinical_summary,
                tone=params.get("tone", "reassuring"),
                language=params.get("language", "English"),
                reading_level=params.get("reading_level", "grade 6")
            )
        elif req.task == "clinician_note":
            # Assuming clinical_summary contains the JSON/structured data
            import json
            try:
                data = json.loads(req.clinical_summary)
            except:
                data = {"summary": req.clinical_summary}
            output = gemma3_service.format_clinician_note(data)
        elif req.task == "follow_up_questions":
            import json
            try:
                context = json.loads(req.clinical_summary)
            except:
                context = {"observations": req.clinical_summary}
            output = gemma3_service.generate_follow_up_questions(context)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown task: {req.task}")
        
        return CommunicationResponse(
            success=True,
            output=output,
            task=req.task
        )
    except Exception as e:
        logger.exception("Gemma 3 task failed: %s", e)
        return CommunicationResponse(
            success=False,
            output=None,
            task=req.task,
            error=str(e)
        )


@app.post("/v1/process_case", response_model=JobResponse, status_code=202)
async def process_case(req: InferRequest, request: Request):
    """
    Orchestrator entry point:
    1. Validate & Store initial intake.
    2. Synchronous agents (Embedding/VisionQA/Temporal - partially done in InferRequest).
    3. Enqueue heavy MedGemma pipeline.
    4. Return job_id + poll_url.
    """
    case_id = req.case_id or str(uuid.uuid4())
    job_id = str(uuid.uuid4())
    
    # Store initial state
    initial_job_data = {
        "case_id": case_id,
        "status": JobStatus.QUEUED,
        "created_at": time.time(),
        "payload": req.json()
    }
    write_job(job_id, initial_job_data)
    
    # Enqueue task
    run_medgemma_pipeline.delay(job_id, req.dict())
    
    poll_url = f"{request.base_url}v1/job/{job_id}"
    
    return JobResponse(
        job_id=job_id,
        case_id=case_id,
        status=JobStatus.QUEUED,
        poll_url=poll_url,
        timestamp=datetime.utcnow().isoformat() + "Z"
    )

@app.get("/v1/job/{job_id}", response_model=AsyncJobStatus)
async def get_job_status(job_id: str):
    """Poll job status from Redis"""
    job_data = read_job(job_id)
    if not job_data:
        raise HTTPException(status_code=404, detail="Job not found")
    
    result_str = job_data.get("result")
    result = json.loads(result_str) if result_str else None
    
    return AsyncJobStatus(
        job_id=job_id,
        status=job_data.get("status", "unknown"),
        result=result,
        error=job_data.get("error"),
        updated_at=float(job_data.get("updated_at", time.time()))
    )

@app.post("/api/sign-off", response_model=InferResponse)
async def sign_off(req: ClinicalSignOffRequest):
    """
    Clinician sign-off endpoint. 
    Enforces HITL by transitioning state from REQUIRES_REVIEW to SIGNED_OFF.
    """
    if req.screening_id not in screening_db:
        raise HTTPException(status_code=404, detail="Screening result not found")
    
    screening = screening_db[req.screening_id]
    
    if screening.status != JobStatus.REQUIRES_REVIEW:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot sign off. Current status is {screening.status}, but REQUIRES_REVIEW is expected."
        )
    
    # Apply human edits if provided
    if req.edits and screening.report:
        for key, value in req.edits.items():
            if hasattr(screening.report, key):
                setattr(screening.report, key, value)
                logger.info("Applied human edit to field: {}", key)
    
    # Record the sign-off in audit log
    audit_entry = AuditLogEntry(
        timestamp=_get_audit_timestamp(),
        action="CLINICAL_SIGN_OFF",
        actor=f"{req.clinician_name} ({req.clinician_id})",
        details=f"Clinician reviewed and signed off. Notes: {req.notes or 'None'}",
        previous_state=JobStatus.REQUIRES_REVIEW,
        new_state=JobStatus.SIGNED_OFF
    )
    
    screening.status = JobStatus.SIGNED_OFF
    screening.audit_log.append(audit_entry)
    
    # Update Job Store if it's an async job
    write_job(req.screening_id, {"status": JobStatus.SIGNED_OFF, "updated_at": time.time()})
    
    logger.info("Clinical sign-off completed for screening: {}", req.screening_id)
    return screening


@app.get("/api/results/{screening_id}", response_model=InferResponse)
async def get_results(screening_id: str):
    """
    Retrieve screening results. 
    In a real HITL system, this would enforce 'SIGNED_OFF' status for external delivery.
    """
    if screening_id not in screening_db:
        raise HTTPException(status_code=404, detail="Screening result not found")
    
    screening = screening_db[screening_id]
    
    # Example of API-level gating mentioned in architecture:
    # if screening.status != JobStatus.SIGNED_OFF:
    #     raise HTTPException(status_code=403, detail="Results are pending clinical review and sign-off.")
    
    return screening


@app.post("/admin/update_adapter")
async def update_adapter(
    body: AdapterUpdateRequest,
    background_tasks: BackgroundTasks
):
    """
    Admin endpoint to update the LoRA adapter.
    
    NOTE: Protect this endpoint in production with authentication!
    """
    logger.info("Admin requested adapter update: {}", body.adapter_source)
    background_tasks.add_task(_fetch_and_attach_adapter, body.adapter_source)
    return {
        "status": "adapter update queued",
        "source": body.adapter_source
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )
