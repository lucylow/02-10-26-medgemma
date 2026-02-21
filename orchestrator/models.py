# orchestrator/models.py — SQLAlchemy models for Job, Case, Audit (RQ-based orchestrator)
import enum
import os
import uuid
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.types import JSON

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./orchestrator_dev.db")
logger = logging.getLogger("orchestrator.models")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class JobStatus(enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    DONE = "DONE"
    FAILED = "FAILED"


class Case(Base):
    __tablename__ = "cases"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(128), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Job(Base):
    __tablename__ = "jobs"
    id = Column(String(64), primary_key=True, index=True)
    case_id = Column(String(128), nullable=False, index=True)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING)
    rq_id = Column(String(128), nullable=True)
    payload = Column(JSON, nullable=True)
    result = Column(JSON, nullable=True)
    error_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = str(uuid.uuid4())


class Audit(Base):
    __tablename__ = "audits"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(64), nullable=False, index=True)
    event = Column(String(128), nullable=False)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    """Create tables (dev convenience). In production use migrations."""
    logger.info("Initializing DB (create tables if not exists)")
    Base.metadata.create_all(bind=engine)
