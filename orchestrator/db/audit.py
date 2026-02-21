"""
Audit store: persist routing decisions and provenance.
Uses Postgres (or SQLite for dev) via connection string from env.
"""
import json
import os
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./orchestrator_audit.db")


def _engine_and_session():
    try:
        from sqlalchemy import create_engine, text
        from sqlalchemy.orm import sessionmaker
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
        Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
        return engine, Session
    except ImportError:
        return None, None


_engine, _Session = _engine_and_session()


class AuditStore:
    """Persist audit entries for each routing decision."""

    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or DATABASE_URL
        self._engine, self._Session = _engine_and_session()

    def record(
        self,
        task_id: str,
        case_id: str,
        decision: Dict[str, Any],
        consent_id: Optional[str] = None,
        status: str = "queued",
    ) -> Optional[str]:
        """
        Insert audit entry. Returns audit_id.
        If DB not available, returns None and does not raise.
        """
        if self._Session is None:
            return None
        audit_id = f"audit-{uuid.uuid4().hex[:16]}"
        router_decision_json = json.dumps(decision) if isinstance(decision, dict) else str(decision)
        try:
            from sqlalchemy import text
            with self._Session() as session:
                session.execute(
                    text("""
                        INSERT INTO audit_entries (audit_id, task_id, case_id, router_decision, consent_id, status, created_at, updated_at)
                        VALUES (:audit_id, :task_id, :case_id, :router_decision, :consent_id, :status, :now, :now)
                    """),
                    {
                        "audit_id": audit_id,
                        "task_id": task_id,
                        "case_id": case_id,
                        "router_decision": router_decision_json,
                        "consent_id": consent_id,
                        "status": status,
                        "now": datetime.utcnow().isoformat(),
                    },
                )
                session.commit()
        except Exception as e:
            if "no such table" in str(e).lower():
                _ensure_tables(self._engine)
                return self.record(task_id, case_id, decision, consent_id, status)
            raise
        return audit_id

    def update_status(self, task_id: str, status: str, agent_id: Optional[str] = None, model_version: Optional[str] = None) -> None:
        """Update audit entry when worker completes."""
        if self._Session is None:
            return
        try:
            from sqlalchemy import text
            with self._Session() as session:
                session.execute(
                    text("""
                        UPDATE audit_entries SET status = :status, agent_id = COALESCE(:agent_id, agent_id),
                        model_version = COALESCE(:model_version, model_version), updated_at = :now
                        WHERE task_id = :task_id
                    """),
                    {"task_id": task_id, "status": status, "agent_id": agent_id, "model_version": model_version, "now": datetime.utcnow().isoformat()},
                )
                session.commit()
        except Exception:
            pass


def _ensure_tables(engine):
    if engine is None:
        return
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS audit_entries (
                audit_id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                case_id TEXT NOT NULL,
                router_decision TEXT,
                agent_id TEXT,
                model_version TEXT,
                consent_id TEXT,
                status TEXT DEFAULT 'queued',
                metadata TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS idempotency_keys (
                idempotency_key TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                status TEXT DEFAULT 'queued',
                created_at TEXT,
                last_seen TEXT
            )
        """))
        conn.commit()
