# Model Server (MedGemma inference)

This folder contains a FastAPI model server that loads a MedGemma model and accepts precomputed image embeddings
(via `/infer_embedding`). It is meant to be run in a GPU-enabled container, but it will also run on CPU.

## Build (GPU-enabled Docker)

Assumes you have Docker with NVIDIA support (nvidia-container-toolkit).

```bash
cd model-server
docker build -t pediscreen-model-server:latest .
```

## Run (GPU)
```bash
docker run --rm --gpus all -p 8000:8000 \
  -e MEDGEMMA_MODEL_PATH=google/medgemma-2b-it \
  pediscreen-model-server:latest
```

If you use Docker on a machine without a GPU, container will still start, but inference may be slow or fail depending on model size.

## Run (CPU-only / dev)
For CPU-only dev, either:
1. use a CPU-compatible image (modify Dockerfile base), or
2. run the app locally with Python:
```bash
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Test the endpoint (curl)
Example: send a precomputed embedding (base64 encoded float32). For quick local testing you can create a fake embedding:
```bash
python - <<PY
import base64, numpy as np
arr = np.random.randn(1,256).astype('float32')  # adjust dims to your model's embedding
b = base64.b64encode(arr.tobytes()).decode()
print(b[:200])
PY
```

Then:
```bash
curl -X POST "http://localhost:8000/infer_embedding" -H "Content-Type: application/json" -d '{
  "case_id":"test-1",
  "age_months":24,
  "observations":"limited vocabulary hearing okay",
  "embedding_b64":"<PASTE_BASE64>",
  "shape":[1,256],
  "max_new_tokens":128,
  "temperature":0.0
}'
```

Replace `<PASTE_BASE64>` with the base64 string printed by the python snippet (very long).

## Notes
- **Model size & GPU**: `google/medgemma-2b-it` and similar HAI-DEF models are large; running them requires available GPU memory. For production consider using a smaller model or Triton/KServe for GPU pooling and batching.
- **Model card & adapters**: If you plan to load LoRA adapters, add `peft` and `bitsandbytes` to `requirements.txt` and change service to `PeftModel.from_pretrained(...)` after loading base model.
- **Security**: Add auth (JWT or mTLS) before exposing the API in production.
