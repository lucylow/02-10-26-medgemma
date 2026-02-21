#!/usr/bin/env bash
# Smoke test: routing orchestrator — start app, POST task, assert 202 and task_id.
set -e
cd "$(dirname "$0")/.."
ORCHESTRATOR_URL="${ORCHESTRATOR_URL:-http://localhost:8080}"

echo "Smoke test: Routing orchestrator at $ORCHESTRATOR_URL"

# Health
curl -sf "$ORCHESTRATOR_URL/health" > /dev/null || { echo "Health check failed"; exit 1; }

# POST route_task (no Redis/DB required for 202 if queue fails gracefully; or use mocks)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$ORCHESTRATOR_URL/route_task" \
  -H "Content-Type: application/json" \
  -d '{"case_id":"smoke-1","task_type":"embed","payload":{},"priority":"normal","idempotency_key":"smoke-key-1","consent":{"consent_given":true}}')
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -n 1)

if [[ "$CODE" != "202" && "$CODE" != "200" ]]; then
  echo "Expected 202 or 200, got $CODE"
  echo "$BODY"
  exit 1
fi

echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'task_id' in d, d; print('task_id:', d['task_id'])"
echo "Smoke test OK"
