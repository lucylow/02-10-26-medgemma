#!/usr/bin/env bash
# Run inference via backend API (embed + infer).
# Usage: ./scripts/run_inference.sh [--ci]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

CI_MODE=false
for arg in "$@"; do
  if [ "$arg" = "--ci" ] || [ "$arg" = "--use-dummy" ]; then
    CI_MODE=true
    break
  fi
done

if [ -d ".venv" ]; then
  . .venv/bin/activate 2>/dev/null || . .venv/Scripts/activate 2>/dev/null || true
fi

export EMBED_MODE="${EMBED_MODE:-real}"
export DUMMY_MEDGEMMA="${DUMMY_MEDGEMMA:-0}"
if [ "$CI_MODE" = true ]; then
  export EMBED_MODE=dummy
  export DUMMY_MEDGEMMA=1
fi

# Start API in background
echo "[run_inference] Starting backend API..."
python -m uvicorn backend.api:app --host 127.0.0.1 --port 8000 --log-level info &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT

sleep 3

# Create fixture if needed
mkdir -p tests/fixtures
if [ ! -f "tests/fixtures/drawing.jpg" ]; then
  python -c "
from PIL import Image
p = 'tests/fixtures/drawing.jpg'
img = Image.new('RGB', (64, 64), color=(255, 255, 255))
img.save(p)
print('Created', p)
"
fi

# POST embed then infer
echo "[run_inference] POST /embed..."
EMB_RESP=$(curl -s -X POST "http://127.0.0.1:8000/embed" -F "file=@tests/fixtures/drawing.jpg")
EMB_B64=$(echo "$EMB_RESP" | python -c "import sys,json; print(json.load(sys.stdin)['embedding_b64'])" 2>/dev/null || echo "")

if [ -z "$EMB_B64" ]; then
  echo "Embed failed: $EMB_RESP"
  exit 1
fi

echo "[run_inference] POST /infer..."
INFER_PAYLOAD=$(python -c "
import json, sys
emb = '''$EMB_B64'''
print(json.dumps({
  'case_id': 'run-inference-test',
  'age_months': 24,
  'observations': 'Says 10 words; limited pincer grasp',
  'embedding_b64': emb,
  'shape': [1, 256],
  'adapter_id': 'pediscreen_v1',
  'consent': {'consent_given': True, 'consent_id': 'test'}
}))
")

curl -s -X POST "http://127.0.0.1:8000/infer" -H "Content-Type: application/json" -d "$INFER_PAYLOAD" | python -m json.tool

echo "[run_inference] Done."
