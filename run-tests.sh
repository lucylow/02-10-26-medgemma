#!/bin/bash
set -euo pipefail

# Wait for services
ORCH_HOST=orchestrator
MODEL_HOST=modelserver

echo "Waiting for orchestrator..."
for i in $(seq 1 30); do
  if curl -sS http://$ORCH_HOST:8080/health >/dev/null 2>&1; then
    echo "orchestrator is up"
    break
  fi
  sleep 1
  echo -n "."
done

echo "Waiting for modelserver..."
for i in $(seq 1 30); do
  if curl -sS http://$MODEL_HOST:8001/health >/dev/null 2>&1; then
    echo "modelserver is up"
    break
  fi
  sleep 1
  echo -n "."
done

echo
echo "Installing test deps..."
pip install --no-cache-dir -r tests/requirements.txt

echo "Running pytest..."
pytest -q tests/test_integration.py -o log_cli=true
