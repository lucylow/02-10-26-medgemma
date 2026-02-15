"""
Data Subject Rights (GDPR) API — Page 9.
Endpoints: export (access/portability), erase (right to be forgotten), rectify.
"""
import json
import zipfile
import io
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.security import get_api_key
from app.services.db import get_db
from app.services.legal_audit import write_audit_entry

router = APIRouter(prefix="/api/dsr", tags=["Data Subject Rights"])


@router.get("/export")
async def dsr_export(
    user_id: Optional[str] = Query(None, description="Pseudonymized user ID"),
    case_id: Optional[str] = Query(None, description="Case ID to export"),
    api_key: str = Depends(get_api_key),
):
    """
    GET /dsr/export — Data subject access / portability.
    Returns all personal data for user_id or case_id in ZIP/JSON.
    """
    if not user_id and not case_id:
        raise HTTPException(
            status_code=400,
            detail="Provide user_id or case_id",
        )
    try:
        db = get_db()
        data: dict[str, Any] = {"exported_at": datetime.now(timezone.utc).isoformat()}

        if case_id:
            screening = await db.screenings.find_one({"screening_id": case_id})
            if screening:
                screening.pop("_id", None)
                data["screenings"] = [screening]
            else:
                data["screenings"] = []
        elif user_id:
            cursor = db.screenings.find({"user_id_pseudonym": user_id})
            screenings = await cursor.to_list(length=1000)
            for s in screenings:
                s.pop("_id", None)
            data["screenings"] = screenings

            cursor = db.consent_records.find({"user_id_pseudonym": user_id})
            consents = await cursor.to_list(length=500)
            for c in consents:
                c.pop("_id", None)
            data["consents"] = consents

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("export.json", json.dumps(data, default=str, indent=2))
        buf.seek(0)

        await write_audit_entry(
            "dsr_export",
            {"user_id": user_id, "case_id": case_id, "actor": "dsr_request"},
        )
        return StreamingResponse(
            buf,
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=dsr_export.zip"},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


class DsrEraseRequest(BaseModel):
    """Request body for erasure."""
    user_id: Optional[str] = Field(None, description="Pseudonymized user ID")
    case_id: Optional[str] = Field(None, description="Case/screening ID to erase")


@router.post("/erase")
async def dsr_erase(
    body: DsrEraseRequest,
    api_key: str = Depends(get_api_key),
):
    """
    POST /dsr/erase — Right to be forgotten.
    Marks data deleted (deleted_at), removes direct identifiers.
    Keeps audit trail of erasure event.
    """
    if not body.user_id and not body.case_id:
        raise HTTPException(status_code=400, detail="Provide user_id or case_id")
    try:
        db = get_db()
        now = datetime.now(timezone.utc).isoformat()
        deleted_count = 0

        if body.case_id:
            result = await db.screenings.update_many(
                {"screening_id": body.case_id},
                {
                    "$set": {
                        "deleted_at": now,
                        "observations": "[REDACTED]",
                        "image_path": None,
                    }
                },
            )
            deleted_count = result.modified_count
        elif body.user_id:
            result = await db.screenings.update_many(
                {"user_id_pseudonym": body.user_id},
                {
                    "$set": {
                        "deleted_at": now,
                        "observations": "[REDACTED]",
                        "image_path": None,
                    }
                },
            )
            deleted_count = result.modified_count

        await write_audit_entry(
            "dsr_erase",
            {
                "user_id": body.user_id,
                "case_id": body.case_id,
                "deleted_count": deleted_count,
                "actor": "dsr_request",
            },
        )
        return {"success": True, "deleted_count": deleted_count}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


class DsrRectifyRequest(BaseModel):
    """Request for rectification."""
    case_id: str = Field(..., description="Case ID to rectify")
    field: str = Field(..., description="Field to correct (e.g. observations)")
    new_value: str = Field(..., description="Corrected value")


@router.post("/rectify")
async def dsr_rectify(
    body: DsrRectifyRequest,
    api_key: str = Depends(get_api_key),
):
    """
    POST /dsr/rectify — Request to correct inaccurate data.
    Logs request; clinician review/approval required for actual update.
    """
    try:
        await write_audit_entry(
            "dsr_rectify_request",
            {
                "case_id": body.case_id,
                "field": body.field,
                "actor": "dsr_request",
                "status": "pending_clinician_review",
            },
        )
        return {
            "success": True,
            "message": "Rectification request logged. Clinician review required.",
            "case_id": body.case_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
