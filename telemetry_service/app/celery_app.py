# telemetry_service/app/celery_app.py
from celery import Celery
from .config import settings

celery_app = Celery(
    "pedi_telemetry",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks"],
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
