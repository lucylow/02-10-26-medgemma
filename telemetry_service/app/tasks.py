# telemetry_service/app/tasks.py
import asyncio
from datetime import date, datetime, timedelta
import logging

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from celery import shared_task

from .config import settings
from . import models
from .bigquery_client import bq_client
from .telemetry.psi import calculate_psi

logger = logging.getLogger(__name__)

# Sync engine for Celery (tasks run in sync context; we use asyncio.run for DB)
_engine = create_async_engine(
    settings.DATABASE_URL, future=True, echo=False, pool_pre_ping=True
)
_AsyncSession = sessionmaker(
    _engine, expire_on_commit=False, class_=AsyncSession, autoflush=False
)


async def _get_daily_aggregates_for_date(target_date: date):
    async with _AsyncSession() as session:
        start = datetime.combine(target_date, datetime.min.time())
        end = start + timedelta(days=1)
        q = (
            select(
                models.TelemetryEvent.model_id,
                func.count(models.TelemetryEvent.id).label("calls"),
                func.avg(models.TelemetryEvent.latency_ms).label("avg_latency"),
                func.avg(models.TelemetryEvent.error_flag.cast(models.TelemetryEvent.error_flag.type)).label("error_rate"),
            )
            .where(
                and_(
                    models.TelemetryEvent.timestamp >= start,
                    models.TelemetryEvent.timestamp < end,
                    models.TelemetryEvent.model_id.isnot(None),
                )
            )
            .group_by(models.TelemetryEvent.model_id)
        )
        from sqlalchemy import cast, Integer
        q = (
            select(
                models.TelemetryEvent.model_id,
                func.count(models.TelemetryEvent.id).label("calls"),
                func.avg(models.TelemetryEvent.latency_ms).label("avg_latency"),
                func.avg(cast(models.TelemetryEvent.error_flag, Integer)).label("error_rate"),
                func.sum(func.coalesce((models.TelemetryEvent.fallback_to != None).cast(Integer), 0)).label("fallback_count"),
            )
            .where(
                and_(
                    models.TelemetryEvent.timestamp >= start,
                    models.TelemetryEvent.timestamp < end,
                    models.TelemetryEvent.model_id.isnot(None),
                )
            )
            .group_by(models.TelemetryEvent.model_id)
        )
        res = await session.execute(q)
        rows = res.all()
        # PSI: use latency_ms distribution vs previous period (simplified: skip if no ref)
        ref_start = start - timedelta(days=7)
        psi_by_model = {}
        for r in rows:
            model_id = r[0]
            curr_latencies_q = await session.execute(
                select(models.TelemetryEvent.latency_ms).where(
                    and_(
                        models.TelemetryEvent.timestamp >= start,
                        models.TelemetryEvent.timestamp < end,
                        models.TelemetryEvent.model_id == model_id,
                        models.TelemetryEvent.latency_ms.isnot(None),
                    )
                )
            )
            ref_latencies_q = await session.execute(
                select(models.TelemetryEvent.latency_ms).where(
                    and_(
                        models.TelemetryEvent.timestamp >= ref_start,
                        models.TelemetryEvent.timestamp < start,
                        models.TelemetryEvent.model_id == model_id,
                        models.TelemetryEvent.latency_ms.isnot(None),
                    )
                )
            )
            ref_list = [x[0] for x in ref_latencies_q.all()]
            curr_list = [x[0] for x in curr_latencies_q.all()]
            psi_val = None
            if len(ref_list) >= 10 and len(curr_list) >= 10:
                try:
                    psi_val, _ = calculate_psi(ref_list, curr_list, buckets=10)
                except Exception as e:
                    logger.warning("PSI calc failed for %s: %s", model_id, e)
            psi_by_model[model_id] = psi_val

        aggregates = []
        for r in rows:
            agg = models.DailyAggregate(
                date=target_date,
                model_id=r[0],
                calls=int(r[1]),
                avg_latency=float(r[2]) if r[2] else None,
                error_rate=float(r[3]) * 100 if r[3] is not None else None,
                fallback_count=int(r[4]) if r[4] else None,
                psi=psi_by_model.get(r[0]),
            )
            aggregates.append(agg)
        for agg in aggregates:
            session.add(agg)
        await session.commit()
        # Optional BQ export (build row from known data; session may have expired attrs)
        for r in rows:
            model_id = r[0]
            row = {
                "date": target_date.isoformat(),
                "model_id": model_id,
                "calls": int(r[1]),
                "avg_latency": float(r[2]) if r[2] else None,
                "error_rate": float(r[3]) * 100 if r[3] is not None else None,
                "fallback_count": int(r[4]) if r[4] else None,
                "psi": psi_by_model.get(model_id),
            }
            bq_client.upload_row("daily_aggregates", row)
        return len(aggregates)


@celery_app.task(name="app.tasks.compute_daily_aggregates")
def compute_daily_aggregates(target_date_str: str = None):
    """Compute daily aggregates and optional PSI for the given date (default: yesterday)."""
    if target_date_str:
        target_date = date.fromisoformat(target_date_str)
    else:
        target_date = date.today() - timedelta(days=1)
    n = asyncio.run(_get_daily_aggregates_for_date(target_date))
    logger.info("Computed %d daily aggregates for %s", n, target_date)
    return {"date": target_date.isoformat(), "aggregates_count": n}
