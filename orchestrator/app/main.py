"""
Routing orchestrator API: POST /route_task, GET /task/{task_id}.
Validates payload, idempotency, routes via Router, persists audit, enqueues or returns sync result.
"""
import datetime
import json
import logging
import os
import uuid
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from orchestrator.agent_registry import AgentRegistry
from orchestrator.agent_base import HTTPAgent
from orchestrator.db.audit import AuditStore
from orchestrator.db.idempotency import IdempotencyStore
from orchestrator.policies import TASK_TYPE_CAPABILITY
from orchestrator.queue import enqueue_task, stream_length, PRIORITY_STREAM_MAP
from orchestrator.router import Router
from orchestrator.router_simple import route as route_simple

logger = logging.getLogger("orchestrator.routing")

app = FastAPI(title="PediScreen Routing Orchestrator", version="0.1.0")


def _init_otel_and_logging():
    """OpenTelemetry tracing + structured JSON logging (optional)."""
    otel_url = os.environ.get("OTEL_COLLECTOR_URL")
    if otel_url:
        try:
            from opentelemetry import trace
            from opentelemetry.sdk.resources import Resource
            from opentelemetry.sdk.trace import TracerProvider
            from opentelemetry.sdk.trace.export import BatchSpanProcessor
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
            from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
            base = otel_url.rstrip("/").rsplit("/v1/", 1)[0] if "/v1/" in otel_url else otel_url.rstrip("/")
            resource = Resource.create({"service.name": "pedi-orchestrator"})
            provider = TracerProvider(resource=resource)
            trace.set_tracer_provider(provider)
            provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=base)))
            FastAPIInstrumentor.instrument_app(app)
            logger.info("OpenTelemetry tracing enabled: %s", base)
        except ImportError:
            logger.debug("OTEL deps not installed, skipping tracing")
    try:
        from pythonjsonlogger import jsonlogger
        handler = logging.StreamHandler()
        handler.setFormatter(jsonlogger.JsonFormatter("%(asctime)s %(name)s %(levelname)s %(message)s"))
        logging.getLogger().handlers = [handler]
    except ImportError:
        pass

# Pluggable for tests
router = Router()
audit_store = AuditStore()
idem_store = IdempotencyStore()


class RouteTaskReq(BaseModel):
    case_id: str
    task_type: str = Field(..., description="embed | analyze_monitor | analyze_refer | audit_log | indexing")
    payload: Dict[str, Any] = Field(default_factory=dict)
    priority: str = Field(default="normal", pattern="^(urgent|high|normal|low)$")
    idempotency_key: Optional[str] = None
    consent: Optional[Dict[str, Any]] = None
    meta: Optional[Dict[str, Any]] = None


@app.post("/route_task")
async def route_task(req: RouteTaskReq, request: Request):
    """Accept task, validate, route (sync or async), persist audit, return task_id or result."""
    trace_id = request.headers.get("traceparent") or request.headers.get("x-trace-id") or str(uuid.uuid4())[:16]
    if req.task_type not in TASK_TYPE_CAPABILITY:
        raise HTTPException(status_code=400, detail="E_INVALID_TASK_TYPE")
    consent = req.consent or {"consent_given": False}
    if req.task_type in ("embed", "analyze_refer") and req.payload.get("image_ref") and not consent.get("consent_given"):
        raise HTTPException(status_code=403, detail="E_CONSENT_REQUIRED")

    # Idempotency
    if req.idempotency_key:
        existing = idem_store.lookup(req.idempotency_key)
        if existing:
            return JSONResponse(
                status_code=200,
                content={"task_id": existing, "status": "duplicate"},
            )

    task_id = f"task-{uuid.uuid4().hex}"
    task = {
        "task_id": task_id,
        "case_id": req.case_id,
        "task_type": req.task_type,
        "priority": req.priority,
        "idempotency_key": req.idempotency_key,
        "consent": consent,
        "payload": req.payload,
        "created_at": datetime.datetime.utcnow().isoformat() + "Z",
        "meta": req.meta or {},
    }

    try:
        decision = await router.decide_and_route(task)
    except Exception as e:
        logger.exception("routing failed: %s", e)
        try:
            orchestrator_tasks_failed_total.labels(reason="routing_error").inc()
        except NameError:
            pass
        raise HTTPException(status_code=503, detail="E_NO_AGENT")

    try:
        orchestrator_tasks_total.labels(task_type=req.task_type, priority=req.priority).inc()
    except NameError:
        pass

    # Audit
    audit_store.record(
        task_id=task_id,
        case_id=req.case_id,
        decision=decision,
        consent_id=consent.get("consent_id"),
        status="queued",
    )

    if decision.get("path") == "sync" and decision.get("result") is not None:
        if req.idempotency_key:
            idem_store.save(req.idempotency_key, task_id, "done")
        return JSONResponse(
            status_code=200,
            content={
                "task_id": task_id,
                "result": decision["result"],
                "status": "completed_sync",
                "agent_id": decision.get("agent_id"),
            },
        )

    # Async: enqueue
    queue_name = decision.get("queue") or PRIORITY_STREAM_MAP.get(req.priority, "tasks:normal")
    enqueue_task(task, queue_name=queue_name)
    try:
        orchestrator_tasks_queued_total.labels(queue=queue_name).inc()
    except NameError:
        pass
    if req.idempotency_key:
        idem_store.save(req.idempotency_key, task_id, "queued")
    return JSONResponse(
        status_code=202,
        content={"task_id": task_id, "status": "queued", "queue": queue_name},
    )


@app.get("/task/{task_id}")
async def get_task(task_id: str):
    """Return task status (and result if stored). Placeholder: extend with result store lookup."""
    # Optional: lookup from Redis or DB by task_id
    return {"task_id": task_id, "status": "unknown"}


@app.post("/route_and_call")
def route_and_call(envelope: RequestEnvelope):
    """
    Lightweight endpoint: routes via in-memory registry to best agent and calls the first one synchronously.
    For heavy jobs, use /route_task for async enqueue and 202 + task_id.
    """
    req = envelope.model_dump() if hasattr(envelope, "model_dump") else envelope.dict()
    req["request_id"] = req.get("request_id") or str(uuid.uuid4())
    req.setdefault("capability", [])

    candidates = route_simple(req, top_k=3)
    if not candidates:
        raise HTTPException(status_code=503, detail="No agents available")

    selected = candidates[0]
    agent_url = selected.get("base_url") or f"http://{selected['agent_id']}:8000"
    timeout_sec = max(1, (req.get("timeout_ms") or 5000) // 1000)
    agent_client = HTTPAgent(selected["agent_id"], url=agent_url, timeout=timeout_sec)

    try:
        resp = agent_client.handle(req)
    except Exception as exc:
        logger.exception("Agent call failed")
        raise HTTPException(status_code=502, detail=f"Agent call failed: {exc}")

    return {
        "request_id": req["request_id"],
        "agent_id": selected["agent_id"],
        "agent_response": resp,
    }


@app.post("/register_agent")
async def register_agent(
    agent_id: str,
    capabilities: str,  # comma-separated (query or form)
    endpoint: str,
    location: str = "cloud",
    supports_raw_media: bool = False,
):
    """Agents call this on startup to register and appear in routing."""
    caps = [c.strip() for c in capabilities.split(",") if c.strip()]
    router.registry.register(
        agent_id=agent_id,
        capabilities=caps,
        endpoint=endpoint,
        location=location,
        supports_raw_media=supports_raw_media,
    )
    return {"status": "ok", "agent_id": agent_id}


@app.get("/health")
def health():
    return {"status": "ok", "service": "routing-orchestrator"}


# ----- Prometheus metrics -----
try:
    from prometheus_client import Counter, Gauge, Histogram, generate_latest, CONTENT_TYPE_LATEST
    from starlette.responses import Response

    orchestrator_tasks_total = Counter("orchestrator_tasks_total", "Total tasks routed", ["task_type", "priority"])
    orchestrator_tasks_queued_total = Counter("orchestrator_tasks_queued_total", "Tasks enqueued", ["queue"])
    orchestrator_tasks_failed_total = Counter("orchestrator_tasks_failed_total", "Tasks failed", ["reason"])
    orchestrator_queue_size = Gauge("orchestrator_queue_size", "Queue length", ["queue"])
    orchestrator_sync_attempts_total = Counter("orchestrator_sync_attempts_total", "Sync attempts", ["outcome"])
    pedi_orch_queue_length = Gauge("pedi_orch_queue_length", "RQ job queue length (pedi-screen)")

    @app.get("/metrics")
    def metrics():
        for name, stream in PRIORITY_STREAM_MAP.items():
            try:
                orchestrator_queue_size.labels(queue=stream).set(stream_length(stream))
            except Exception:
                pass
        try:
            from orchestrator.queue_rq import queue
            pedi_orch_queue_length.set(len(queue))
        except Exception:
            pass
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
except ImportError:
    pass

# ----- Startup: OTEL + logging, then RQ tables -----
@app.on_event("startup")
def _startup():
    _init_otel_and_logging()
    try:
        from orchestrator.models import init_db
        init_db()
        logger.info("RQ orchestrator tables initialized.")
    except ImportError:
        pass

# ----- RQ-based orchestrator API (submit / status / jobs) -----
try:
    from orchestrator.api_router import router as api_router
    app.include_router(api_router, prefix="/api", tags=["orchestrator"])
except ImportError as e:
    logger.warning("RQ orchestrator not loaded (missing deps?): %s", e)
