# backend/app/api/health.py
from fastapi import APIRouter, Response
from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "medgemma_mode": settings.MEDGEMMA_MODE}


@router.get("/metrics")
async def metrics():
    """Prometheus scrape endpoint. No auth (for in-cluster Prometheus)."""
    try:
        from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
        return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
    except ImportError:
        return Response(content="# prometheus_client not installed\n", media_type="text/plain")
