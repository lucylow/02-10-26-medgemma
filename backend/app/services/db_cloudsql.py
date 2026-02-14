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
