"""
Unit tests: idempotency store — same idempotency_key does not create duplicate tasks.
"""
import os
import tempfile
import pytest

# Use in-memory SQLite for tests
os.environ["DATABASE_URL"] = "sqlite:///:memory:"


@pytest.fixture
def idem_store():
    from orchestrator.db.idempotency import IdempotencyStore, _ensure_idem_table
    from sqlalchemy import create_engine, text
    engine = create_engine("sqlite:///:memory:")
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE idempotency_keys (
                idempotency_key TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                status TEXT DEFAULT 'queued',
                created_at TEXT,
                last_seen TEXT
            )
        """))
        conn.commit()
    store = IdempotencyStore(database_url="sqlite:///:memory:")
    store._engine = engine
    from sqlalchemy.orm import sessionmaker
    store._Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    return store


def test_idempotency_lookup_empty(idem_store):
    assert idem_store.lookup("key-nonexistent") is None


def test_idempotency_save_and_lookup(idem_store):
    idem_store.save("embed-20260224-case-1", "task-abc", "queued")
    assert idem_store.lookup("embed-20260224-case-1") == "task-abc"


def test_idempotency_duplicate_returns_existing(idem_store):
    idem_store.save("k1", "task-1", "queued")
    assert idem_store.lookup("k1") == "task-1"
    idem_store.save("k1", "task-1", "done")
    assert idem_store.lookup("k1") == "task-1"
