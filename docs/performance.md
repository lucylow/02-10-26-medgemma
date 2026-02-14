# Performance & Concurrency

## Batching

- **`/infer_batch`** (optional): Accept a list of inference requests and run batched generation when the model supports it. If not, fallback to serial processing.
- For MedGemma, batching depends on `device_map="auto"` and available GPU memory.

## Async Workers & Job Queue

- **Redis + RQ/Celery**: For heavy inference, use a job queue. `docker-compose` includes Redis.
- **`/infer`** can return `202 Accepted` with `job_id`; poll `/job/{job_id}` for completion when queued.

## Concurrency & GPU

- **One process per GPU**: Avoid multiple workers copying the same model. Use `device_map="auto"` for multi-GPU.
- **Torch threads**: `torch.set_num_threads(1)` to avoid oversubscription on CPU.
- For CUDA, ensure one process per GPU or use model parallelism.

## Autoscaling

- **Kubernetes**: Configure HPA based on request queue length (KEDA) or custom metrics (latency, GPU utilization).
- **SLOs**: 95% p95 latency < 1s (on-device), < 5s (remote inference); error rate < 1%.
