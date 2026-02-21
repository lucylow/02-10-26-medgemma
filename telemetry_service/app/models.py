# telemetry_service/app/models.py
import sqlalchemy as sa
from sqlalchemy.orm import declarative_base
from sqlalchemy import Index

Base = declarative_base()


class TelemetryEvent(Base):
    __tablename__ = "telemetry_events"
    id = sa.Column(sa.Integer, primary_key=True, index=True)
    event_id = sa.Column(sa.String(64), unique=True, index=True, nullable=False)
    timestamp = sa.Column(sa.DateTime(timezone=True), index=True, nullable=False)
    org_id = sa.Column(sa.String(128), index=True, nullable=True)
    app = sa.Column(sa.String(128), nullable=True)
    user_id = sa.Column(sa.String(128), nullable=True)
    case_id = sa.Column(sa.String(128), nullable=True)
    model_id = sa.Column(sa.String(256), nullable=True, index=True)
    adapter_id = sa.Column(sa.String(256), nullable=True)
    provider = sa.Column(sa.String(64), nullable=True)
    latency_ms = sa.Column(sa.Integer, nullable=True)
    status_code = sa.Column(sa.Integer, nullable=True)
    error_flag = sa.Column(sa.Boolean, default=False)
    fallback_to = sa.Column(sa.String(256), nullable=True)
    raw_json = sa.Column(sa.JSON, nullable=True)

    __table_args__ = (
        Index("ix_telemetry_event_time_model", "timestamp", "model_id"),
    )


class DailyAggregate(Base):
    __tablename__ = "daily_aggregates"
    id = sa.Column(sa.Integer, primary_key=True)
    date = sa.Column(sa.Date, index=True, nullable=False)
    model_id = sa.Column(sa.String(256), index=True, nullable=False)
    calls = sa.Column(sa.Integer, nullable=False, default=0)
    avg_latency = sa.Column(sa.Float, nullable=True)
    error_rate = sa.Column(sa.Float, nullable=True)
    fallback_count = sa.Column(sa.Integer, nullable=True)
    psi = sa.Column(sa.Float, nullable=True)
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now())
