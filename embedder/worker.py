"""
Embedder queue worker entrypoint.
Delegates to orchestrator.workers.embedder_worker.
Run from repo root: python embedder/worker.py
"""
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
if str(root) not in sys.path:
    sys.path.insert(0, str(root))

from orchestrator.workers.embedder_worker import process_task, run_worker

if __name__ == "__main__":
    run_worker(consumer_id="embedder-1", process_fn=process_task)
