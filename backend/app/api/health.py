# backend/app/api/health.py
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "medgemma_mode": settings.MEDGEMMA_MODE}
