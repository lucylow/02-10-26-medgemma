"""
Cloud SQL DB helpers (PostgreSQL via Cloud SQL Connector).
Used when INSTANCE_CONNECTION_NAME is set (e.g. Cloud Run deployment).
Schema matches supabase/migrations: screenings (child_age_months, domain, observations, image_path, report jsonb).
"""
import json
import os
from sqlalchemy import text
from app.services.cloudsql_connector import get_engine
from app.core.logger import logger


def is_cloudsql_enabled() -> bool:
    """True when Cloud SQL should be used (INSTANCE_CONNECTION_NAME set)."""
    return bool(os.environ.get("INSTANCE_CONNECTION_NAME"))


def insert_screening_record(
    screening_id: str,
    child_age_months: int,
    domain: str,
    observations: str,
    image_path: str | None,
    report: dict,
):
    """
    Inserts a screening record into the 'screenings' table.
    Schema: (screening_id, child_age_months, domain, observations, image_path, report jsonb, created_at)
    """
    engine = get_engine()
    insert_sql = text("""
        INSERT INTO screenings (screening_id, child_age_months, domain, observations, image_path, report)
        VALUES (:screening_id, :child_age_months, :domain, :observations, :image_path, :report::jsonb)
    """)
    params = {
        "screening_id": screening_id,
        "child_age_months": child_age_months,
        "domain": domain,
        "observations": observations,
        "image_path": image_path,
        "report": json.dumps(report),
    }
    try:
        with engine.begin() as conn:
            conn.execute(insert_sql, params)
    except Exception as e:
        logger.error("Failed to insert screening record: %s", e)
        raise


def fetch_screenings(limit: int = 50, offset: int = 0):
    """Fetch screenings ordered by created_at DESC."""
    engine = get_engine()
    sql = text("""
        SELECT screening_id, child_age_months, domain, observations, image_path, report, created_at
        FROM screenings ORDER BY created_at DESC LIMIT :limit OFFSET :offset
    """)
    with engine.connect() as conn:
        res = conn.execute(sql, {"limit": limit, "offset": offset})
        rows = [dict(r._mapping) for r in res]
    return rows


def fetch_screening_by_id(screening_id: str):
    """Fetch a single screening by screening_id."""
    engine = get_engine()
    sql = text("""
        SELECT screening_id, child_age_months, domain, observations, image_path, report, created_at
        FROM screenings WHERE screening_id = :screening_id
    """)
    with engine.connect() as conn:
        res = conn.execute(sql, {"screening_id": screening_id})
        row = res.first()
        return dict(row._mapping) if row else None


# --- Reports (for end2end flow when Cloud SQL is used) ---

def insert_report(report_id: str, screening_id: str, patient_info: dict, draft_json: dict) -> None:
    """Insert a new report draft into reports table."""
    engine = get_engine()
    sql = text("""
        INSERT INTO reports (report_id, screening_id, patient_info, draft_json, status, created_at)
        VALUES (:report_id, :screening_id, :patient_info::jsonb, :draft_json::jsonb, 'draft', now())
    """)
    with engine.begin() as conn:
        conn.execute(sql, {
            "report_id": report_id,
            "screening_id": screening_id,
            "patient_info": json.dumps(patient_info),
            "draft_json": json.dumps(draft_json),
        })


def insert_report_audit(report_id: str, action: str, actor: str, payload: dict) -> None:
    """Insert audit entry for a report action."""
    engine = get_engine()
    sql = text("""
        INSERT INTO report_audit (report_id, action, actor, payload, created_at)
        VALUES (:report_id, :action, :actor, :payload::jsonb, now())
    """)
    with engine.begin() as conn:
        conn.execute(sql, {
            "report_id": report_id,
            "action": action,
            "actor": actor,
            "payload": json.dumps(payload),
        })


def fetch_report_by_id(report_id: str) -> dict | None:
    """Fetch a report by report_id."""
    engine = get_engine()
    sql = text("""
        SELECT report_id, screening_id, patient_info, draft_json, final_json, status,
               clinician_id, clinician_signed_at, created_at
        FROM reports WHERE report_id = :report_id
    """)
    with engine.connect() as conn:
        row = conn.execute(sql, {"report_id": report_id}).first()
        if not row:
            return None
        d = dict(row._mapping)
        if d.get("clinician_signed_at"):
            ts = d["clinician_signed_at"]
            d["clinician_signed_at"] = ts.timestamp() if hasattr(ts, "timestamp") else ts
        if d.get("created_at"):
            ts = d["created_at"]
            d["created_at"] = ts.timestamp() if hasattr(ts, "timestamp") else ts
        return d


def update_report_draft(report_id: str, draft_json: dict) -> dict | None:
    """Update draft_json for a report. Returns updated draft or None if not found."""
    engine = get_engine()
    sel = text("SELECT draft_json FROM reports WHERE report_id = :rid FOR UPDATE")
    upd = text("UPDATE reports SET draft_json = :djson::jsonb WHERE report_id = :rid")
    with engine.begin() as conn:
        row = conn.execute(sel, {"rid": report_id}).first()
        if not row:
            return None
        conn.execute(upd, {"djson": json.dumps(draft_json), "rid": report_id})
    return draft_json


def finalize_report(report_id: str, final_json: dict, clinician_id: str) -> None:
    """Finalize a report: set final_json, status, clinician_id."""
    engine = get_engine()
    sql = text("""
        UPDATE reports SET final_json = :fjson::jsonb, status = 'finalized',
        clinician_id = :cid, clinician_signed_at = now()
        WHERE report_id = :rid
    """)
    with engine.begin() as conn:
        conn.execute(sql, {
            "fjson": json.dumps(final_json),
            "cid": clinician_id,
            "rid": report_id,
        })
