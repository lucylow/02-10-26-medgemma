# telemetry_service/app/bigquery_client.py
import logging
from typing import Any, Dict, List

from .config import settings

logger = logging.getLogger(__name__)

try:
    from google.cloud import bigquery
    _BQ_AVAILABLE = True
except ImportError:
    _BQ_AVAILABLE = False
    bigquery = None


class BigQueryClient:
    def __init__(self):
        if settings.ENABLE_BIGQUERY and _BQ_AVAILABLE and settings.BIGQUERY_PROJECT:
            self.client = bigquery.Client(project=settings.BIGQUERY_PROJECT)
            self.dataset = settings.BIGQUERY_DATASET
            logger.info(
                "BigQuery client initialized for project %s dataset %s",
                settings.BIGQUERY_PROJECT,
                self.dataset,
            )
        else:
            self.client = None
            self.dataset = None
            logger.info(
                "BigQuery disabled (missing config or library: ENABLE_BIGQUERY=%s, available=%s)",
                settings.ENABLE_BIGQUERY,
                _BQ_AVAILABLE,
            )

    def upload_row(self, table: str, row: Dict[str, Any]) -> bool:
        if not self.client or not self.dataset:
            return False
        try:
            table_ref = f"{settings.BIGQUERY_PROJECT}.{self.dataset}.{table}"
            errors = self.client.insert_rows_json(table_ref, [row])
            if errors:
                logger.warning("BigQuery insert_rows_json errors for %s: %s", table, errors)
                return False
            return True
        except Exception as e:
            logger.exception("BigQuery upload_row failed: %s", e)
            return False

    def upload_rows(self, table: str, rows: List[Dict[str, Any]]) -> int:
        if not self.client or not self.dataset or not rows:
            return 0
        try:
            table_ref = f"{settings.BIGQUERY_PROJECT}.{self.dataset}.{table}"
            errors = self.client.insert_rows_json(table_ref, rows)
            if errors:
                logger.warning("BigQuery insert_rows_json had %d errors", len(errors))
            return len(rows) - len(errors)
        except Exception as e:
            logger.exception("BigQuery upload_rows failed: %s", e)
            return 0


bq_client = BigQueryClient()
