"""
Idempotency store: prevent duplicate task creation for same idempotency_key.
"""
import os
from datetime import datetime
from typing import Optional

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./orchestrator_audit.db")


def _session():
    try:
        from sqlalchemy import create_engine, text
        from sqlalchemy.orm import sessionmaker
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
        Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
        return engine, Session
    except ImportError:
        return None, None


_engine, _Session = _session()


class IdempotencyStore:
    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or DATABASE_URL
        self._engine, self._Session = _engine, _Session

    def lookup(self, idempotency_key: str) -> Optional[str]:
        """Return existing task_id if key already used; else None."""
        if self._Session is None:
            return None
        try:
            from sqlalchemy import text
            with self._Session() as session:
                row = session.execute(
                    text("SELECT task_id, status FROM idempotency_keys WHERE idempotency_key = :k"),
                    {"k": idempotency_key},
                ).fetchone()
                if row and row[1] in ("queued", "in_progress", "done"):
                    return row[0]
        except Exception:
            _ensure_idem_table(self._engine)
        return None

    def save(self, idempotency_key: str, task_id: str, status: str = "queued") -> None:
        if self._Session is None:
            return
        try:
            from sqlalchemy import text
            now = datetime.utcnow().isoformat()
            with self._Session() as session:
                if "sqlite" in self.database_url:
                    session.execute(
                        text("""
                            INSERT OR REPLACE INTO idempotency_keys (idempotency_key, task_id, status, created_at, last_seen)
                            VALUES (:k, :task_id, :status, :now, :now)
                        """),
                        {"k": idempotency_key, "task_id": task_id, "status": status, "now": now},
                    )
                else:
                    session.execute(
                        text("""
                            INSERT INTO idempotency_keys (idempotency_key, task_id, status, created_at, last_seen)
                            VALUES (:k, :task_id, :status, :now, :now)
                            ON CONFLICT (idempotency_key) DO UPDATE SET task_id = :task_id, status = :status, last_seen = :now
                        """),
                        {"k": idempotency_key, "task_id": task_id, "status": status, "now": now},
                    )
                session.commit()
        except Exception as e:
            if "no such table" in str(e).lower():
                _ensure_idem_table(self._engine)
                self.save(idempotency_key, task_id, status)
            else:
                raise


def _ensure_idem_table(engine):
    if engine is None:
        return
    from sqlalchemy import text
    with engine.connect() as conn:
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
