#!/usr/bin/env bash
# End-to-end demo: API server (embed + infer) with real or fallback mode
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

# CI/dummy mode: skip heavy model loads
CI_MODE=false
for arg in "$@"; do
  if [ "$arg" = "--ci" ] || [ "$arg" = "--use-dummy" ]; then
    CI_MODE=true
    break
  fi
done

# Activate venv if present
if [ -d ".venv" ]; then
  # shellcheck source=/dev/null
  . .venv/bin/activate 2>/dev/null || . .venv/Scripts/activate 2>/dev/null || true
fi

export EMBED_MODE="${EMBED_MODE:-real}"
export REAL_MODE="${REAL_MODE:-true}"
export FALLBACK_ON_ERROR="${FALLBACK_ON_ERROR:-true}"

if [ "$CI_MODE" = true ]; then
  export REAL_MODE=false
  export EMBED_MODE=dummy
fi

echo "EMBED_MODE=$EMBED_MODE REAL_MODE=$REAL_MODE FALLBACK_ON_ERROR=$FALLBACK_ON_ERROR"

# Start API server (unified: /health, /embed, /infer)
echo "[run_demo] Starting API server..."
uvicorn backend.api:app --host 127.0.0.1 --port 8000 &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT
sleep 2

# Demo inference request with synthetic embedding
python - <<'PY'
import base64
import numpy as np
import requests
import time

arr = (np.ones((1, 256), dtype="float32") * 0.01)
b64 = base64.b64encode(arr.tobytes()).decode()
payload = {
    "case_id": "demo-1",
    "age_months": 24,
    "observations": "few words, says about 10 words",
    "embedding_b64": b64,
    "shape": [1, 256],
    "adapter_id": "pediscreen_v1",
    "consent": {"consent_given": True},
}
r = requests.post("http://127.0.0.1:8000/infer", json=payload, timeout=60)
print("status", r.status_code)
print(r.json())
PY

echo "[run_demo] Done."
