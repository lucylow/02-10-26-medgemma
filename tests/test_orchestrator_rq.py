# tests/test_orchestrator_rq.py — pytest for RQ-based orchestrator (submit, status, list jobs)
import os
import pytest
from fastapi.testclient import TestClient

# Set DB before importing app so orchestrator.models uses it
@pytest.fixture(scope="module")
def db_url(tmp_path_factory):
    d = tmp_path_factory.mktemp("db")
    return f"sqlite:///{d}/test_rq.db"


@pytest.fixture(scope="module")
def app_client(db_url):
    os.environ["DATABASE_URL"] = db_url
    from orchestrator.models import init_db
    init_db()
    from orchestrator.app.main import app
    return TestClient(app)


def fake_model_call(url, payload):
    return {"result": {"summary": "fake summary", "risk": "monitor"}, "ok": True}


def sync_enqueue(job_id):
    import modelreasoner.worker as worker_mod
    return worker_mod.process_job(job_id)


def test_submit_and_status(app_client, monkeypatch):
    monkeypatch.setenv("CLOUD_MODEL_URL", "http://fake.invalid")
    monkeypatch.setattr("orchestrator.queue_rq.enqueue_job", lambda job_id: sync_enqueue(job_id))
    monkeypatch.setattr("modelreasoner.worker._call_model_server", lambda url, payload: {"result": {"summary": "ok"}, "success": True})

    resp = app_client.post("/api/submit", json={"age_months": 24, "observations": "limited vocabulary", "preferred_target": "auto"})
    assert resp.status_code == 200
    data = resp.json()
    assert "job_id" in data

    job_id = data["job_id"]
    st = app_client.get(f"/api/status/{job_id}")
    assert st.status_code == 200
    stj = st.json()
    assert stj["status"] in ("DONE", "FAILED", "RUNNING", "PENDING")


def test_list_jobs(app_client, monkeypatch):
    monkeypatch.setenv("CLOUD_MODEL_URL", "http://fake.invalid")
    monkeypatch.setattr("orchestrator.queue_rq.enqueue_job", lambda job_id: sync_enqueue(job_id))
    monkeypatch.setattr("modelreasoner.worker._call_model_server", lambda url, payload: {"result": {"text": "ok"}, "success": True})

    r1 = app_client.post("/api/submit", json={"observations": "a"})
    r2 = app_client.post("/api/submit", json={"observations": "b"})
    assert r1.status_code == 200 and r2.status_code == 200

    lst = app_client.get("/api/jobs")
    assert lst.status_code == 200
    arr = lst.json()
    assert isinstance(arr, list)
    assert len(arr) >= 2


def test_health(app_client):
    r = app_client.get("/health")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"
