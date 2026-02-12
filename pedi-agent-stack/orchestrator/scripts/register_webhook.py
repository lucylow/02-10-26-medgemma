#!/usr/bin/env python3
"""
One-shot script to register a webhook with the orchestrator.
Used by init-seed service in docker-compose.override.yml.
"""
import os
import sys
import time
import requests

ORCH = os.environ.get("ORCHESTRATOR_URL", "http://orchestrator:7000")
CLINIC_ID = os.environ.get("CLINIC_ID", "demo-clinic")
WEBHOOK_URL = os.environ.get("WEBHOOK_URL", "http://host.docker.internal:9000/webhook_receiver")

payload = {"clinic_id": CLINIC_ID, "url": WEBHOOK_URL}
print("Registering webhook:", payload, "at", ORCH + "/v1/webhooks/register")

# Retry a few times in case orchestrator is still starting
for attempt in range(5):
    try:
        r = requests.post(ORCH + "/v1/webhooks/register", json=payload, timeout=8)
        r.raise_for_status()
        print("Registered webhook:", r.json())
        sys.exit(0)
    except Exception as e:
        print(f"Attempt {attempt + 1}/5 failed: {e}")
        if attempt < 4:
            time.sleep(2)
        else:
            sys.exit(1)
