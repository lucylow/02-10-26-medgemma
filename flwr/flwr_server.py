# flwr/flwr_server.py
"""
Flower federated learning server with Prometheus instrumentation.
Aggregates metrics from FL clients (loss, accuracy, examples, PSI).
"""
import os
import logging

import flwr as fl
from prometheus_client import start_http_server, Counter, Gauge

# Optional Sentry
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.05, environment=os.getenv("ENVIRONMENT", "dev"))

logger = logging.getLogger("flwr_server")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

# Prometheus metrics
ROUND_COUNTER = Counter("fl_rounds_total", "Federated rounds executed")
CLIENT_EXAMPLES = Gauge("fl_client_examples_total", "Examples processed", ["client_id"])
CLIENT_LOSS = Gauge("fl_client_loss", "Latest loss", ["client_id"])
CLIENT_ACC = Gauge("fl_client_accuracy", "Latest accuracy", ["client_id"])
PSI_GAUGE = Gauge("psi_value", "Population Stability Index", ["org_id"])

PROM_PORT = int(os.getenv("PROM_PORT", "8000"))
start_http_server(PROM_PORT)
logger.info("Prometheus metrics on :%d", PROM_PORT)

strategy = fl.server.strategy.FedAvg(
    fraction_fit=1.0,
    fraction_evaluate=1.0,
    min_fit_clients=2,
    min_evaluate_clients=2,
    min_available_clients=2,
)


def fit_metrics_aggregation(metrics):
    """Aggregate fit metrics from clients and export to Prometheus."""
    ROUND_COUNTER.inc()
    for cid, m in metrics:
        try:
            CLIENT_EXAMPLES.labels(client_id=str(cid)).set(int(m.get("num_examples", 0)))
            CLIENT_LOSS.labels(client_id=str(cid)).set(float(m.get("loss", 0.0)))
            CLIENT_ACC.labels(client_id=str(cid)).set(float(m.get("accuracy", 0.0)))
        except Exception:
            logger.exception("Metrics update failed for client %s", cid)
    return {}


if __name__ == "__main__":
    logger.info("Starting Flower server (FedAvg, %s rounds)...", os.getenv("NUM_ROUNDS", "3"))
    fl.server.start_server(
        server_address="0.0.0.0:8080",
        config=fl.server.ServerConfig(num_rounds=int(os.getenv("NUM_ROUNDS", "3"))),
        strategy=strategy,
    )
