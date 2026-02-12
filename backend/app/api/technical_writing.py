# backend/app/api/technical_writing.py
"""Technical writing API — generates research-grade prose via MedGemma."""

from fastapi import APIRouter, HTTPException

from app.services.technical_writer import (
    TechnicalWriterService,
    TechnicalWritingRequest,
)
from app.schemas.report_template import ReportRevision

router = APIRouter(prefix="/api/writing", tags=["Technical Writing"])
writer = TechnicalWriterService()

# In-memory store for report revisions (production: use DB)
_revisions: list[dict] = []


@router.post("/generate")
async def generate_technical_text(req: TechnicalWritingRequest):
    """Generate technical writing (README, whitepaper, slide copy, judge pitch)."""
    try:
        return await writer.generate(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/generate-structured")
async def generate_structured_report(req: TechnicalWritingRequest):
    """Generate structured report with locked sections and citation placeholders."""
    try:
        result = await writer.generate_structured(req)
        # Extract citation placeholders from all editable section content
        placeholders = []
        if "sections" in result:
            for sec in result["sections"]:
                placeholders.extend(writer.extract_citation_placeholders(sec.get("content", "")))
        elif "slides" in result:
            for slide in result["slides"]:
                placeholders.extend(writer.extract_citation_placeholders(slide.get("content", "")))
        result["citation_placeholders"] = sorted(set(placeholders))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/save-revision")
async def save_revision(rev: ReportRevision):
    """Store AI vs human edit for audit trail."""
    _revisions.append(rev.model_dump())
    return {"ok": True}


@router.get("/revisions/{report_id}")
async def get_revisions(report_id: str):
    """Retrieve revisions for a report (for diff view)."""
    matches = [r for r in _revisions if r["report_id"] == report_id]
    return {"revisions": matches}
