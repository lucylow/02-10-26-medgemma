#!/usr/bin/env bash
# Verify Lovable Cloud / Supabase Edge Functions.
# Usage: BASE=https://PROJECT.supabase.co/functions/v1 ./scripts/verify-edge-functions.sh
# Or set VITE_SUPABASE_FUNCTION_URL in .env and run from repo root.

set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ -f .env ]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

BASE="${BASE:-${VITE_SUPABASE_FUNCTION_URL}}"
if [ -z "$BASE" ]; then
  echo "Set BASE or VITE_SUPABASE_FUNCTION_URL (e.g. https://YOUR_PROJECT.supabase.co/functions/v1)"
  exit 1
fi

# Trim trailing slash
BASE="${BASE%/}"
echo "Testing Edge Functions at: $BASE"
echo ""

# Health
echo "1. GET $BASE/health"
CODE=$(curl -sS -o /tmp/ef_health.json -w "%{http_code}" "$BASE/health")
if [ "$CODE" = "200" ] || [ "$CODE" = "503" ]; then
  echo "   HTTP $CODE"
  STATUS=$(jq -r '.status // "unknown"' /tmp/ef_health.json 2>/dev/null || echo "?")
  echo "   status: $STATUS"
  if [ -f /tmp/ef_health.json ] && command -v jq >/dev/null 2>&1; then
    DB_OK=$(jq -r '.checks.db.connected // false' /tmp/ef_health.json 2>/dev/null)
    echo "   db.connected: $DB_OK"
  fi
else
  echo "   FAILED HTTP $CODE"
  cat /tmp/ef_health.json 2>/dev/null | head -5
fi
echo ""

# List screenings
echo "2. GET $BASE/list_screenings?limit=2"
CODE=$(curl -sS -o /tmp/ef_list.json -w "%{http_code}" "$BASE/list_screenings?limit=2")
if [ "$CODE" = "200" ]; then
  echo "   HTTP $CODE"
  if command -v jq >/dev/null 2>&1; then
    ITEMS=$(jq -r '.items | length' /tmp/ef_list.json 2>/dev/null || echo "?")
    echo "   items count: $ITEMS"
  fi
else
  echo "   FAILED HTTP $CODE"
  cat /tmp/ef_list.json 2>/dev/null | head -5
fi
echo ""

# Analyze (POST)
echo "3. POST $BASE/analyze (JSON)"
CODE=$(curl -sS -X POST "$BASE/analyze" \
  -H "Content-Type: application/json" \
  -d '{"childAge":24,"domain":"general","observations":"Points to pictures, says about 10 words."}' \
  -o /tmp/ef_analyze.json -w "%{http_code}")
if [ "$CODE" = "200" ]; then
  echo "   HTTP $CODE"
  if command -v jq >/dev/null 2>&1; then
    SUCCESS=$(jq -r '.success // false' /tmp/ef_analyze.json 2>/dev/null)
    SID=$(jq -r '.screening_id // "?"' /tmp/ef_analyze.json 2>/dev/null)
    echo "   success: $SUCCESS, screening_id: $SID"
  fi
else
  echo "   FAILED HTTP $CODE"
  cat /tmp/ef_analyze.json 2>/dev/null | head -5
fi
echo ""

echo "Done. Health and list_screenings/analyze should return 200 when DB and secrets are configured."
