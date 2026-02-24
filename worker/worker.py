# worker/worker.py
import os
import time
import logging
import requests
from redis import Redis
from rq import Queue, Worker, Connection
from prometheus_client import Gauge, Counter, Histogram, start_http_server
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("worker")

REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
QUEUE_NAME = os.environ.get("RQ_QUEUE_NAME", "tasks")
METRICS_PORT = int(os.environ.get("METRICS_PORT", "9001"))
OTEL_ENDPOINT = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT")

JOB_SUCCESS = Counter("worker_jobs_success_total", "Number of successful jobs")
JOB_FAILURE = Counter("worker_jobs_failure_total", "Number of failed jobs")
JOB_LATENCY = Histogram(
    "worker_job_latency_seconds",
    "Time taken to process jobs",
    buckets=(0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5),
)
RQ_QUEUE_GAUGE = Gauge("rq_queue_length", "Length of RQ queue", ["queue_name"])

if OTEL_ENDPOINT:
    resource = Resource.create(attributes={"service.name": "pedi-worker"})
    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint=OTEL_ENDPOINT, insecure=True)
    processor = BatchSpanProcessor(exporter)
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)
    tracer = trace.get_tracer(__name__)
else:
    tracer = trace.get_tracer(__name__)


def process_agent_call(job_payload):
    start = time.time()
    try:
        agent_url = job_payload["agent_url"]
        envelope = job_payload["envelope"]
        resp = requests.post(f"{agent_url}/call", json=envelope, timeout=30)
        resp.raise_for_status()
        JOB_SUCCESS.inc()
        return resp.json()
    except Exception as exc:
        JOB_FAILURE.inc()
        logger.exception("Failed to process agent call: %s", exc)
        raise
    finally:
        elapsed = time.time() - start
        JOB_LATENCY.observe(elapsed)


def main():
    start_http_server(METRICS_PORT)
    logger.info("Started Prometheus metrics on port %s", METRICS_PORT)

    redis_conn = Redis.from_url(REDIS_URL)
    try:
        qlen = redis_conn.llen(f"rq:queue:{QUEUE_NAME}")
        RQ_QUEUE_GAUGE.labels(queue_name=QUEUE_NAME).set(qlen)
    except Exception:
        pass

    with Connection(redis_conn):
        w = Worker([Queue(QUEUE_NAME, connection=redis_conn)])
        w.work(with_scheduler=True)


if __name__ == "__main__":
    main()
