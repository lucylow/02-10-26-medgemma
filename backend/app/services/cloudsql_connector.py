"""
Cloud SQL Python Connector integration (recommended for Cloud Run).
Creates a SQLAlchemy engine backed by the Cloud SQL Python Connector using pg8000.
Docs reference: https://cloud.google.com/sql/docs/postgres/connect-instance-auth-proxy
"""
import os
from google.cloud.sql.connector import Connector, IPTypes
import sqlalchemy
from sqlalchemy.engine import Engine

# Module-level connector and engine are safe to reuse across requests/revisions.
_connector: Connector | None = None
_engine: Engine | None = None


def get_connector() -> Connector:
    global _connector
    if _connector is None:
        # LAZY refresh_strategy reduces background CPU usage while keeping certs fresh
        _connector = Connector(refresh_strategy="LAZY")
    return _connector


def get_engine() -> Engine:
    """
    Returns a SQLAlchemy Engine that uses the Connector to obtain secure ephemeral
    connections to Cloud SQL. Environment variables required:
      - INSTANCE_CONNECTION_NAME (project:region:instance)
      - DB_USER
      - DB_PASS (optional if using IAM DB auth)
      - DB_NAME
      - PRIVATE_IP (set to any value to prefer private IP access)
    """
    global _engine
    if _engine is not None:
        return _engine

    instance_connection_name = os.environ.get("INSTANCE_CONNECTION_NAME")
    if not instance_connection_name:
        raise RuntimeError("INSTANCE_CONNECTION_NAME must be set (project:region:instance)")

    db_user = os.environ.get("DB_USER", "postgres")
    db_pass = os.environ.get("DB_PASS")
    db_name = os.environ.get("DB_NAME", "pediscreen")

    ip_type = IPTypes.PRIVATE if os.environ.get("PRIVATE_IP") else IPTypes.PUBLIC
    connector = get_connector()

    def getconn():
        conn = connector.connect(
            instance_connection_name,
            "pg8000",
            user=db_user,
            password=db_pass,
            db=db_name,
            ip_type=ip_type,
            enable_iam_auth=os.environ.get("CLOUDSQL_ENABLE_IAM_AUTH", "false").lower() in ("1", "true", "yes"),
        )
        return conn

    _engine = sqlalchemy.create_engine(
        "postgresql+pg8000://", creator=getconn, pool_size=5, max_overflow=10
    )
    return _engine


def dispose_engine():
    global _engine, _connector
    if _engine:
        _engine.dispose()
        _engine = None
    if _connector:
        try:
            _connector.close()
        except Exception:
            pass
        _connector = None
