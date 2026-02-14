#!/usr/bin/env bash
# Smoke test for CI: start API with dummy mode, curl /health, /embed, /infer.
set -euo pipefail

export EMBED_MODE=dummy
export DUMMY_MEDGEMMA=1
export USE_DUMMY=1

# Start uvicorn in background
python -m uvicorn backend.api:app --host 127.0.0.1 --port 8000 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT

sleep 5

# Health
echo "=== /health ==="
curl -sf http://127.0.0.1:8000/health | python -m json.tool
echo ""

# Embed (need a small image)
mkdir -p tests/fixtures
if [ ! -f tests/fixtures/drawing.jpg ]; then
  python -c "
from PIL import Image
img = Image.new('RGB', (64, 64), color=(255,255,255))
img.save('tests/fixtures/drawing.jpg')
"
fi

echo "=== /embed ==="
EMB=$(curl -sf -X POST http://127.0.0.1:8000/embed -F "file=@tests/fixtures/drawing.jpg")
echo "$EMB" | python -m json.tool
B64=$(echo "$EMB" | python -c "import sys,json; print(json.load(sys.stdin).get('embedding_b64',''))")
if [ -z "$B64" ]; then
  echo "ERROR: No embedding_b64 in response"
  exit 1
fi
echo ""

# Infer
echo "=== /infer ==="
PAYLOAD=$(python -c "
import json
print(json.dumps({
  'case_id': 'smoke-test',
  'age_months': 24,
  'observations': 'test obs',
  'embedding_b64': '''$B64''',
  'shape': [1, 256],
  'adapter_id': 'pediscreen_v1',
  'consent': {'consent_given': True}
}))
")
curl -sf -X POST http://127.0.0.1:8000/infer -H "Content-Type: application/json" -d "$PAYLOAD" | python -m json.tool

echo ""
echo "=== Smoke CI passed ==="
