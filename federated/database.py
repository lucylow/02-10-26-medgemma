"""
Phase 3: Persist federated round metrics to observability DB.
"""
import logging
import os
from typing import Optional

logger = logging.getLogger("federated.database")


def save_round_metrics(
    round_number: int,
    global_loss: Optional[float] = None,
    global_accuracy: Optional[float] = None,
    participating_clients: int = 0,
    dp_noise_multiplier: Optional[float] = None,
    secure_aggregation: bool = False,
) -> None:
    """Insert one row into federated_round_metrics. Best-effort."""
    engine = _get_engine()
    if engine is None:
        return
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO federated_round_metrics
                (round_number, global_loss, global_accuracy, participating_clients,
                 dp_noise_multiplier, secure_aggregation)
                VALUES (:round_number, :global_loss, :global_accuracy, :participating_clients,
                        :dp_noise_multiplier, :secure_aggregation)
            """), {
                "round_number": round_number,
                "global_loss": global_loss,
                "global_accuracy": global_accuracy,
                "participating_clients": participating_clients,
                "dp_noise_multiplier": dp_noise_multiplier,
                "secure_aggregation": secure_aggregation,
            }
    except Exception as e:
        logger.warning("Save federated_round_metrics failed: %s", e)


def _get_engine():
    try:
        from app.services.db_cloudsql import is_cloudsql_enabled
        if is_cloudsql_enabled():
            from app.services.cloudsql_connector import get_engine
            return get_engine()
    except Exception:
        pass
    url = os.environ.get("DATABASE_URL") or os.environ.get("OBSERVABILITY_DATABASE_URL")
    if url:
        from sqlalchemy import create_engine
        return create_engine(url)
    return None
