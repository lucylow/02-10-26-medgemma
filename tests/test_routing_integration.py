"""
Integration tests: POST /route_task, queue, audit (with Redis and DB or mocks).
"""
import os
import tempfile
import pytest

# Shared SQLite file so audit and idempotency use the same DB ( :memory: would create two DBs )
_test_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_test_db.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_test_db.name}"


@pytest.fixture
def app_client():
    from fastapi.testclient import TestClient
    from orchestrator.app.main import app
    # Ensure tables exist for test DB
    try:
        from sqlalchemy import create_engine, text
        engine = create_engine(os.environ["DATABASE_URL"])
        with engine.connect() as conn:
            conn.execute(text("CREATE TABLE IF NOT EXISTS audit_entries (audit_id TEXT PRIMARY KEY, task_id TEXT, case_id TEXT, router_decision TEXT, agent_id TEXT, model_version TEXT, consent_id TEXT, status TEXT, metadata TEXT, created_at TEXT, updated_at TEXT)"))
            conn.execute(text("CREATE TABLE IF NOT EXISTS idempotency_keys (idempotency_key TEXT PRIMARY KEY, task_id TEXT, status TEXT, created_at TEXT, last_seen TEXT)"))
            conn.commit()
    except Exception:
        pass
    return TestClient(app)


@pytest.fixture
def mock_redis(monkeypatch):
    """Mock Redis so we don't need a real Redis in CI."""
    tasks = []
    class MockRedis:
        def xadd(self, stream, fields, maxlen=None, approximate=False):
            tasks.append((stream, fields))
            return "0-1"
        def xlen(self, stream):
            return sum(1 for s, _ in tasks if s == stream)
    try:
        import redis
        monkeypatch.setattr("orchestrator.queue._redis", lambda: MockRedis())
    except ImportError:
        pass
    return tasks


def test_route_task_returns_202_and_task_id(app_client, mock_redis):
    """POST /route_task with valid payload returns 202 and task_id."""
    r = app_client.post(
        "/route_task",
        json={
            "case_id": "case-1",
            "task_type": "embed",
            "payload": {"image_ref": "s3://bucket/img.jpg"},
            "priority": "normal",
            "idempotency_key": "embed-1",
            "consent": {"consent_given": True, "consent_id": "c1"},
        },
    )
    assert r.status_code in (202, 200)
    data = r.json()
    assert "task_id" in data
    assert data["task_id"].startswith("task-")
    if r.status_code == 202:
        assert data.get("status") == "queued"


def test_route_task_idempotency_duplicate(app_client, mock_redis):
    """Same idempotency_key second time returns 200 and status duplicate or same task_id."""
    payload = {
        "case_id": "case-2",
        "task_type": "embed",
        "payload": {},
        "priority": "normal",
        "idempotency_key": "idem-dup-test",
        "consent": {"consent_given": True},
    }
    r1 = app_client.post("/route_task", json=payload)
    r2 = app_client.post("/route_task", json=payload)
    assert r1.status_code in (200, 202)
    assert r2.status_code == 200
    assert r2.json().get("status") == "duplicate"
    assert r2.json()["task_id"] == r1.json()["task_id"]


def test_route_task_invalid_type_400(app_client):
    r = app_client.post(
        "/route_task",
        json={"case_id": "c1", "task_type": "invalid_type", "payload": {}},
    )
    assert r.status_code == 400


def test_health(app_client):
    r = app_client.get("/health")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_register_agent(app_client):
    r = app_client.post(
        "/register_agent",
        json={
            "agent_id": "embedder-1",
            "capabilities": "embed",
            "endpoint": "http://localhost:8001",
            "location": "edge-clinic-1",
        },
    )
    assert r.status_code == 200
    assert r.json().get("agent_id") == "embedder-1"
