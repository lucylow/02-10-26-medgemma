# telemetry_service/app/main.py
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db import get_session, init_models
from . import crud
from .schemas import TelemetryEventIn, OverviewResponse
from .bigquery_client import bq_client

logger = logging.getLogger(__name__)

# Optional Sentry
if settings.SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.asyncio import AsyncioIntegration
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENV,
            traces_sample_rate=0.1,
            integrations=[FastApiIntegration(), AsyncioIntegration()],
        )
        logger.info("Sentry initialized")
    except Exception as e:
        logger.warning("Sentry init failed: %s", e)

# Optional Google Cloud Logging (structured logs to GCP)
def setup_gcp_logging():
    try:
        import google.cloud.logging
        client = google.cloud.logging.Client()
        client.setup_logging()
        logger.info("Google Cloud Logging enabled")
    except Exception as e:
        logger.debug("Google Cloud Logging not configured: %s", e)

if settings.ENV == "production":
    setup_gcp_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_models()
    yield
    # shutdown if needed


app = FastAPI(
    title="PediScreen Telemetry API",
    version="0.1.0",
    description="Telemetry and usage API for PediScreen AI. OpenAPI-aligned.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def parse_range(range_param: str) -> int:
    """Return number of days for range (1h -> 0 days, 24h -> 1, 7d -> 7, etc.)."""
    r = (range_param or "7d").lower()
    if r == "1h":
        return 1
    if r == "24h":
        return 1
    if r == "7d":
        return 7
    if r == "30d":
        return 30
    if r == "90d":
        return 90
    return 7


@app.post("/events", status_code=202)
async def ingest_events(
    payload: TelemetryEventIn,
    session: AsyncSession = Depends(get_session),
):
    """Ingest a single telemetry event. Optionally forwards to BigQuery."""
    ev = payload.model_dump(mode="json")
    ev["timestamp"] = payload.timestamp
    await crud.create_event(session, ev)
    await session.commit()
    if bq_client.client:
        bq_client.upload_row("telemetry_events", ev)
    return {"status": "accepted", "event_id": payload.event_id}


@app.get("/telemetry")
async def telemetry(
    action: str = Query("overview", description="overview | models | errors | fallbacks"),
    range: str = Query("7d", description="1h | 24h | 7d | 30d | 90d"),
    session: AsyncSession = Depends(get_session),
):
    """OpenAPI-aligned telemetry endpoints. Same action/range as Supabase edge function."""
    days = parse_range(range)
    if action == "overview":
        data = await crud.get_overview(session, days=days)
        return data
    if action == "models":
        models_list = await crud.get_model_aggregates(session, days=days, limit=20)
        return {"models": models_list, "since": None, "trace_id": None}
    if action == "errors":
        errors_list = await crud.get_errors(session, days=days, limit=100)
        return {"errors": errors_list, "since": None, "trace_id": None}
    if action == "fallbacks":
        fallbacks_list, reason_summary = await crud.get_fallbacks(session, days=days, limit=100)
        return {"fallbacks": fallbacks_list, "reason_summary": reason_summary, "since": None, "trace_id": None}
    return {"error_code": "UNKNOWN_ACTION", "message": "Use: overview, models, errors, fallbacks"}


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
