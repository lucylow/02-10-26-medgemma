# orchestrator/api_router.py — HTTP endpoints for submit, status, list jobs (RQ-based)
import logging
import os
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from orchestrator.models import SessionLocal, Job, Case, Audit, JobStatus
from orchestrator.queue_rq import enqueue_job

logger = logging.getLogger("orchestrator.router")
router = APIRouter()

try:
    from orchestrator.app.auth import require_api_key
    AUTH_DEPS = [Depends(require_api_key)]
except ImportError:
    AUTH_DEPS = []


class SubmitRequest(BaseModel):
    case_id: Optional[str] = Field(None, description="Optional case identifier")
    age_months: Optional[int] = None
    observations: Optional[str] = None
    embedding_b64: Optional[str] = None
    preferred_target: Optional[str] = Field(None, description="edge|cloud|auto")


class SubmitResponse(BaseModel):
    job_id: str
    queued_at: datetime


class StatusResponse(BaseModel):
    job_id: str
    status: str
    created_at: datetime
    updated_at: datetime
    result: Optional[dict] = None
    error: Optional[str] = None


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/submit", response_model=SubmitResponse, dependencies=AUTH_DEPS)
def submit(req: SubmitRequest, db: Session = Depends(get_db)):
    """
    Submit a new screening inference job.
    Stores job + case and enqueues a worker.
    """
    try:
        case_id = req.case_id or str(uuid.uuid4())

        case = db.query(Case).filter(Case.case_id == case_id).one_or_none()
        if case is None:
            case = Case(case_id=case_id, created_at=datetime.utcnow())
            db.add(case)
            db.commit()
            db.refresh(case)

        payload = {
            "age_months": req.age_months,
            "observations": req.observations,
            "embedding_b64": req.embedding_b64,
            "preferred_target": req.preferred_target or "auto",
        }

        job = Job(
            case_id=case.case_id,
            status=JobStatus.PENDING,
            payload=payload,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        rq_job_id = enqueue_job(job_id=str(job.id))
        job.rq_id = rq_job_id
        db.add(job)
        db.commit()

        logger.info("Enqueued job %s (rq=%s)", job.id, rq_job_id)
        return SubmitResponse(job_id=str(job.id), queued_at=job.created_at)
    except SQLAlchemyError as e:
        logger.exception("DB error on submit: %s", e)
        raise HTTPException(status_code=500, detail="DB error")
    except Exception as e:
        logger.exception("Error on submit: %s", e)
        raise HTTPException(status_code=500, detail="internal error")


@router.get("/status/{job_id}", response_model=StatusResponse)
def status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    return StatusResponse(
        job_id=str(job.id),
        status=job.status.value,
        created_at=job.created_at,
        updated_at=job.updated_at,
        result=job.result,
        error=job.error_text,
    )


@router.get("/jobs", response_model=List[StatusResponse], dependencies=AUTH_DEPS)
def list_jobs(limit: int = 50, db: Session = Depends(get_db)):
    jobs = db.query(Job).order_by(Job.created_at.desc()).limit(limit).all()
    return [
        StatusResponse(
            job_id=str(j.id),
            status=j.status.value,
            created_at=j.created_at,
            updated_at=j.updated_at,
            result=j.result,
            error=j.error_text,
        )
        for j in jobs
    ]
