#!/usr/bin/env bash
# Verify MedGemma backend: health and /api/infer (mock or live).
# Usage: from repo root, ensure backend is running (e.g. cd backend && uvicorn app.main:app --reload)
#   ./scripts/verify-medgemma-backend.sh
# Or: BASE_URL=http://localhost:8000 ./scripts/verify-medgemma-backend.sh

set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

BASE_URL="${BASE_URL:-http://localhost:8000}"
API_KEY="${API_KEY:-dev-example-key}"
BASE_URL="${BASE_URL%/}"

echo "MedGemma backend: $BASE_URL"
echo ""

# 1. Health
echo "1. GET $BASE_URL/health"
CODE=$(curl -sS -o /tmp/mb_health.json -w "%{http_code}" "$BASE_URL/health")
if [ "$CODE" = "200" ]; then
  echo "   HTTP $CODE"
  if command -v jq >/dev/null 2>&1; then
    STATUS=$(jq -r '.status // "?"' /tmp/mb_health.json)
    APP=$(jq -r '.app // "?"' /tmp/mb_health.json)
    echo "   status: $STATUS, app: $APP"
  else
    cat /tmp/mb_health.json
  fi
else
  echo "   FAILED HTTP $CODE"
  cat /tmp/mb_health.json 2>/dev/null || true
  exit 1
fi
echo ""

# 2. Infer (embedding_b64 = base64 of 1*256 float32 zeros = 1024 bytes)
EMB_B64=$(python3 -c "import base64; print(base64.b64encode(b'\\x00' * 1024).decode())")
echo "2. POST $BASE_URL/api/infer"
CODE=$(curl -sS -X POST "$BASE_URL/api/infer" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{\"case_id\":\"verify-$(date +%s)\",\"age_months\":24,\"observations\":\"Points to pictures.\",\"embedding_b64\":\"$EMB_B64\",\"shape\":[1,256]}" \
  -o /tmp/mb_infer.json -w "%{http_code}")
if [ "$CODE" = "200" ]; then
  echo "   HTTP $CODE"
  if command -v jq >/dev/null 2>&1; then
    CASE=$(jq -r '.case_id // "?"' /tmp/mb_infer.json)
    RISK=$(jq -r '.result.risk // "?"' /tmp/mb_infer.json)
    FALLBACK=$(jq -r '.fallback_used // "?"' /tmp/mb_infer.json)
    echo "   case_id: $CASE, risk: $RISK, fallback_used: $FALLBACK"
  else
    head -20 /tmp/mb_infer.json
  fi
else
  echo "   FAILED HTTP $CODE"
  cat /tmp/mb_infer.json 2>/dev/null || true
  exit 1
fi
echo ""

echo "MedGemma backend health and infer OK."
