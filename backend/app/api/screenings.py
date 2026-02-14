# backend/app/api/screenings.py
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.security import get_api_key
from app.services.db import get_db
from app.services.db_cloudsql import is_cloudsql_enabled, fetch_screenings as cloudsql_fetch_screenings, fetch_screening_by_id as cloudsql_fetch_screening
from app.services.screening_diff import diff_screenings, build_change_observation, push_change_observation_to_fhir
from typing import List, Optional

router = APIRouter()


def _normalize_screening_doc(doc: dict) -> dict:
    """Normalize screening doc for API response (Cloud SQL uses child_age_months, MongoDB uses childAge)."""
    if not doc:
        return doc
    out = dict(doc)
    if "child_age_months" in out and "childAge" not in out:
        out["childAge"] = out["child_age_months"]
    if "created_at" in out and "timestamp" not in out:
        out["timestamp"] = out["created_at"]
    return out


@router.get("/api/screenings", dependencies=[Depends(get_api_key)])
async def list_screenings(limit: int = 50, skip: int = 0):
    if is_cloudsql_enabled():
        rows = cloudsql_fetch_screenings(limit=limit, offset=skip)
        res = [_normalize_screening_doc(r) for r in rows]
        return {"items": res, "count": len(res)}
    db = get_db()
    cursor = db.screenings.find().sort("timestamp", -1).skip(skip).limit(limit)
    res = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        res.append(doc)
    return {"items": res, "count": len(res)}


@router.get("/api/screenings/{screening_id}", dependencies=[Depends(get_api_key)])
async def get_screening(screening_id: str):
    if is_cloudsql_enabled():
        doc = cloudsql_fetch_screening(screening_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Not found")
        return _normalize_screening_doc(doc)
    db = get_db()
    doc = await db.screenings.find_one({"screening_id": screening_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    doc["_id"] = str(doc["_id"])
    return doc


@router.get("/api/screenings/diff")
async def screening_diff(
    patient_id: str = Query(..., description="Patient ID"),
    current_screening_id: str = Query(..., description="Current screening/report ID"),
    prev_screening_id: Optional[str] = Query(None, description="Previous screening ID (omit to use most recent)"),
    push_to_fhir: bool = Query(False, description="Push change summary to EHR as FHIR Observation"),
    fhir_base_url: Optional[str] = Query(None),
    fhir_token: Optional[str] = Query(None),
    api_key: str = Depends(get_api_key),
):
    """
    "What changed since last screening?" — longitudinal diff.
    Returns domain-level changes (e.g. Language: Monitor → Improving).
    Optionally pushes FHIR Observation to EHR.
    """
    db = get_db()

    # Current report
    curr_doc = await db.reports.find_one(
        {"$or": [{"report_id": current_screening_id}, {"screening_id": current_screening_id}]},
        sort=[("created_at", -1)],
    )
    if not curr_doc:
        curr_doc = await db.screenings.find_one({"screening_id": current_screening_id})
    if not curr_doc:
        raise HTTPException(status_code=404, detail="Current screening/report not found")

    curr = curr_doc.get("final_json") or curr_doc.get("draft_json") or curr_doc.get("report") or curr_doc
    if isinstance(curr, dict) and "draft_json" in curr:
        curr = curr.get("draft_json", curr)

    # Previous report
    if prev_screening_id:
        prev_doc = await db.reports.find_one(
            {"$or": [{"report_id": prev_screening_id}, {"screening_id": prev_screening_id}]},
            sort=[("created_at", -1)],
        )
        if not prev_doc:
            prev_doc = await db.screenings.find_one({"screening_id": prev_screening_id})
    else:
        # Find most recent report for patient, excluding current
        curr_report_id = curr_doc.get("report_id") or current_screening_id
        cursor = db.reports.find(
            {"$or": [{"patient_info.patient_id": patient_id}, {"screening_id": patient_id}]}
        ).sort("created_at", -1)
        prev_doc = None
        async for d in cursor:
            if d.get("report_id") != curr_report_id and d.get("screening_id") != current_screening_id:
                prev_doc = d
                break

    if not prev_doc:
        return {
            "changes": [],
            "message": "No previous screening found for comparison",
        }

    prev = prev_doc.get("final_json") or prev_doc.get("draft_json") or prev_doc.get("report") or prev_doc
    if isinstance(prev, dict) and "draft_json" in prev:
        prev = prev.get("draft_json", prev)

    changes = diff_screenings(prev, curr)
    obs = build_change_observation(patient_id, changes) if changes else None

    ehr_response = None
    if push_to_fhir and changes and fhir_base_url and fhir_token:
        try:
            ehr_response = push_change_observation_to_fhir(
                fhir_base_url, fhir_token, patient_id, changes
            )
        except Exception as e:
            return {
                "changes": changes,
                "observation": obs,
                "ehr_error": str(e),
            }

    return {
        "changes": changes,
        "observation": obs,
        "ehr_response": ehr_response,
    }
