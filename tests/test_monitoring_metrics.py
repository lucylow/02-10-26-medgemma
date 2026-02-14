"""Mock test ensuring metric functions run."""
import os

os.environ["METRICS_DUMMY"] = "1"

from monitoring.export_metrics import record_inference, record_embedding_norm


def test_record_inference():
    record_inference(0.5, 0.72, "ok")


def test_record_embedding_norm():
    record_embedding_norm(1.0)
