"""
DB models for idempotency and audit.
Use SQLAlchemy or plain SQL; migrations via script or Alembic.
"""
from datetime import datetime
from typing import Any, Dict, Optional

# Optional SQLAlchemy; if not installed, use raw SQL in store implementations
try:
    from sqlalchemy import Column, DateTime, String, Text, create_engine
    from sqlalchemy.dialects.postgresql import JSONB
    from sqlalchemy.orm import declarative_base, sessionmaker
    HAS_SQLALCHEMY = True
except ImportError:
    HAS_SQLALCHEMY = False
    declarative_base = None
    Column = DateTime = String = Text = JSONB = create_engine = sessionmaker = None

if HAS_SQLALCHEMY:
    Base = declarative_base()

    class IdempotencyKey(Base):
        __tablename__ = "idempotency_keys"
        idempotency_key = Column(String(512), primary_key=True)
        task_id = Column(String(128), nullable=False)
        status = Column(String(32), default="queued")  # queued, in_progress, done, failed
        created_at = Column(DateTime, default=datetime.utcnow)
        last_seen = Column(DateTime, nullable=True)

    class AuditEntry(Base):
        __tablename__ = "audit_entries"
        audit_id = Column(String(64), primary_key=True)
        task_id = Column(String(128), nullable=False)
        case_id = Column(String(128), nullable=False)
        router_decision = Column(Text, nullable=True)  # JSON string
        agent_id = Column(String(128), nullable=True)
        model_version = Column(String(128), nullable=True)
        consent_id = Column(String(128), nullable=True)
        status = Column(String(32), default="queued")  # queued, claimed, completed, failed
        metadata_ = Column("metadata", Text, nullable=True)  # JSON string
        created_at = Column(DateTime, default=datetime.utcnow)
        updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
else:
    Base = None
    IdempotencyKey = None
    AuditEntry = None
