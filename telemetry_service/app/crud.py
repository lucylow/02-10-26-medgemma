# telemetry_service/app/crud.py
import logging
from datetime import date, datetime, timedelta

import sqlalchemy as sa
from sqlalchemy import select, func, and_, cast, case
from sqlalchemy.ext.asyncio import AsyncSession

from . import models

logger = logging.getLogger(__name__)


async def create_event(session: AsyncSession, ev: dict):
    model = ev.get("model") or {}
    resp = ev.get("response") or {}
    db = models.TelemetryEvent(
        event_id=ev.get("event_id"),
        timestamp=ev.get("timestamp"),
        org_id=ev.get("org_id"),
        app=ev.get("app"),
        user_id=ev.get("user_id"),
        case_id=ev.get("case_id"),
        model_id=model.get("model_id"),
        adapter_id=model.get("adapter_id"),
        provider=model.get("provider"),
        latency_ms=resp.get("latency_ms"),
        status_code=resp.get("status_code"),
        error_flag=not (200 <= (resp.get("status_code") or 500) < 300),
        fallback_to=resp.get("fallback_to"),
        raw_json=ev,
    )
    session.add(db)
    await session.flush()
    return db


async def get_overview(session: AsyncSession, days: int = 7):
    now = datetime.utcnow()
    start = now - timedelta(days=days)
    total_q = await session.execute(
        select(func.count(models.TelemetryEvent.id)).where(
            models.TelemetryEvent.timestamp >= start
        )
    )
    total = total_q.scalar() or 0

    # Single pass over events for last_used and aggregates
    events_q = await session.execute(
        select(models.TelemetryEvent).where(
            models.TelemetryEvent.timestamp >= start
        )
    )
    events = events_q.scalars().all()
    success_count = sum(1 for e in events if not e.error_flag)
    error_count = sum(1 for e in events if e.error_flag)
    fallback_count = sum(1 for e in events if e.fallback_to is not None)
    latencies = [e.latency_ms for e in events if e.latency_ms is not None]
    avg_latency_ms = round(sum(latencies) / len(latencies)) if latencies else 0
    total_cost_usd = 0.0
    for e in events:
        if e.raw_json and isinstance(e.raw_json, dict):
            total_cost_usd += float(e.raw_json.get("cost_estimate_usd") or 0)
    total_cost_usd = round(total_cost_usd * 1_000_000) / 1_000_000
    last_used = events[-1].timestamp if events else None
    five_min_ago = now - timedelta(minutes=5)
    active_connection = any(e.timestamp >= five_min_ago for e in events)

    top_q = await session.execute(
        select(
            models.TelemetryEvent.model_id,
            func.count(models.TelemetryEvent.id).label("calls"),
        )
        .where(models.TelemetryEvent.timestamp >= start)
        .group_by(models.TelemetryEvent.model_id)
        .order_by(func.count(models.TelemetryEvent.id).desc())
        .limit(1)
    )
    top = top_q.first()
    top_model = {"model_id": top[0], "calls": top[1]} if top else None

    model_count_q = await session.execute(
        select(func.count(func.distinct(models.TelemetryEvent.model_id))).where(
            and_(
                models.TelemetryEvent.timestamp >= start,
                models.TelemetryEvent.model_id.isnot(None),
            )
        )
    )
    number_of_models = model_count_q.scalar() or 0

    series = []
    for i in range(days):
        dstart = (start + timedelta(days=i)).date()
        dend = dstart + timedelta(days=1)
        day_events = [e for e in events if dstart <= e.timestamp.date() < dend]
        calls = len(day_events)
        errors = sum(1 for e in day_events if e.error_flag)
        fallbacks = sum(1 for e in day_events if e.fallback_to is not None)
        cost = 0.0
        for e in day_events:
            if e.raw_json and isinstance(e.raw_json, dict):
                cost += float(e.raw_json.get("cost_estimate_usd") or 0)
        series.append({
            "date": dstart.isoformat(),
            "calls": calls,
            "errors": errors,
            "fallbacks": fallbacks,
            "cost": round(cost * 1_000_000) / 1_000_000,
        })

    return {
        "active_connection": active_connection,
        "last_used": last_used,
        "total_requests": int(total),
        "success_count": success_count,
        "error_count": error_count,
        "fallback_count": fallback_count,
        "avg_latency_ms": avg_latency_ms,
        "total_cost_usd": total_cost_usd,
        "number_of_models": number_of_models,
        "top_model": top_model,
        "timeseries": series,
    }


async def get_model_aggregates(
    session: AsyncSession, days: int = 7, limit: int = 20
):
    now = datetime.utcnow()
    start = now - timedelta(days=days)
    q = (
        select(
            models.TelemetryEvent.model_id,
            func.count(models.TelemetryEvent.id).label("calls"),
            func.avg(models.TelemetryEvent.latency_ms).label("avg_latency_ms"),
            func.avg(cast(models.TelemetryEvent.error_flag, sa.Integer)).label(
                "error_rate"
            ),
            func.sum(case((models.TelemetryEvent.fallback_to.isnot(None), 1), else_=0)).label(  # noqa: E501
                "fallback_count"
            ),
        )
        .where(models.TelemetryEvent.timestamp >= start)
        .group_by(models.TelemetryEvent.model_id)
        .order_by(func.count(models.TelemetryEvent.id).desc())
        .limit(limit)
    )
    res = await session.execute(q)
    rows = res.all()
    out = []
    for r in rows:
        out.append({
            "model_id": r[0],
            "calls": int(r[1]),
            "avg_latency_ms": float(r[2] or 0),
            "error_rate": round(float(r[3] or 0) * 100, 2),
            "fallback_count": int(r[4] or 0),
        })
    return out


async def get_errors(
    session: AsyncSession, days: int = 7, limit: int = 100
):
    now = datetime.utcnow()
    start = now - timedelta(days=days)
    q = (
        select(models.TelemetryEvent)
        .where(
            and_(
                models.TelemetryEvent.timestamp >= start,
                models.TelemetryEvent.error_flag == True,
            )
        )
        .order_by(models.TelemetryEvent.timestamp.desc())
        .limit(limit)
    )
    res = await session.execute(q)
    rows = res.scalars().all()
    return [
        {
            "id": str(e.id),
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "model_id": e.model_id,
            "error_code": (e.raw_json or {}).get("response", {}).get("error_code") if isinstance(e.raw_json, dict) else None,
            "status_code": e.status_code,
            "fallback_reason": e.fallback_to,
            "latency_ms": e.latency_ms,
            "trace_id": (e.raw_json or {}).get("trace_id") if isinstance(e.raw_json, dict) else None,
        }
        for e in rows
    ]


async def get_fallbacks(
    session: AsyncSession, days: int = 7, limit: int = 100
):
    now = datetime.utcnow()
    start = now - timedelta(days=days)
    q = (
        select(models.TelemetryEvent)
        .where(
            and_(
                models.TelemetryEvent.timestamp >= start,
                models.TelemetryEvent.fallback_to.isnot(None),
            )
        )
        .order_by(models.TelemetryEvent.timestamp.desc())
        .limit(limit)
    )
    res = await session.execute(q)
    rows = res.scalars().all()
    reason_summary = {}
    for e in rows:
        r = e.fallback_to or "unknown"
        reason_summary[r] = reason_summary.get(r, 0) + 1
    return [
        {
            "id": str(e.id),
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "model_id": e.model_id,
            "fallback_reason": e.fallback_to,
            "screening_id": (e.raw_json or {}).get("case_id") if isinstance(e.raw_json, dict) else None,
            "latency_ms": e.latency_ms,
        }
        for e in rows
    ], reason_summary
