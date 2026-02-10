import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
celery = Celery("pedi_orch", broker=REDIS_URL, backend=REDIS_URL)

# Optional: task serialization / accepted content
celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)
