"""
ModelReasoner queue worker entrypoint.
Delegates to orchestrator.workers.modelreasoner_worker.
Run from repo root: python modelreasoner/worker.py
"""
import sys
from pathlib import Path

# Ensure repo root on path
root = Path(__file__).resolve().parents[1]
if str(root) not in sys.path:
    sys.path.insert(0, str(root))

from orchestrator.workers.modelreasoner_worker import process_task, run_worker

if __name__ == "__main__":
    run_worker(consumer_id="modelreasoner-1", process_fn=process_task)
