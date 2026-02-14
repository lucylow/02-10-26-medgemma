# Monitoring

## Metrics (Prometheus)

- `inference_requests_total`
- `inference_latency_seconds` (histogram)
- `inference_confidence_distribution`
- `input_embedding_mean_norm`, `embedding_drift_cosine`
- `model_version_loaded`

## Drift Detection

- Compute embedding population stats (mean, std) hourly
- Cosine distribution shift vs baseline; alert if threshold exceeded

## SLOs

- 95% p95 latency < 1s (on-device), < 5s (remote)
- Error rate < 1%
