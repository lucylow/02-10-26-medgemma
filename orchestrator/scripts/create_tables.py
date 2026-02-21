"""
Create audit_entries and idempotency_keys tables (SQLite or Postgres).
Run from repo root: python orchestrator/scripts/create_tables.py
"""
import os
import sys
from pathlib import Path

# repo root
root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root))

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./orchestrator_audit.db")


def main():
    try:
        from sqlalchemy import create_engine, text
    except ImportError:
        print("Install sqlalchemy: pip install sqlalchemy")
        sys.exit(1)
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    )
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
    print("Tables created:", DATABASE_URL)


if __name__ == "__main__":
    main()
