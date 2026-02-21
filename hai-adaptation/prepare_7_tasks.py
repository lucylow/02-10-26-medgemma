"""
HAI-DEF data prep: create data/hai-pediatric dirs and optional placeholder/sample JSONL.

Usage:
  python hai-adaptation/prepare_7_tasks.py
  python hai-adaptation/prepare_7_tasks.py --samples 100   # write 100 sample rows per task (synthetic)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_HAI_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _HAI_DIR.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

# Load task_datasets without requiring package name
import importlib.util
_spec = importlib.util.spec_from_file_location("task_datasets", _HAI_DIR / "task_datasets.py")
_task_datasets = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_task_datasets)

DATA_ROOT = _REPO_ROOT / "data" / "hai-pediatric"

TASK_DIRS = {
    "asq3": "asq3_scoring",
    "rop": "rop_detection",
    "bone_age": "bone_age",
    "growth": "growth_zscore",
    "fracture": "fractures",
    "chw_workflow": "chw_workflow",
    "multilingual": "multilingual",
}


def ensure_dirs() -> None:
    """Create data/hai-pediatric/<task> directories."""
    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    for dir_name in TASK_DIRS.values():
        (DATA_ROOT / dir_name).mkdir(parents=True, exist_ok=True)
    # README
    readme = DATA_ROOT / "README.md"
    if not readme.exists():
        readme.write_text("""# HAI-DEF Pediatric Task Data (~15K samples)

Place JSONL files per task:

- asq3_scoring/   (~5K)  — ASQ-3 scoring
- rop_detection/  (~3K)  — ROP zone/stage
- bone_age/       (~4K)  — Bone age assessment
- growth_zscore/  (~1.5K)— Growth z-scores
- fractures/      (~1.5K)— Fracture classification
- chw_workflow/   — CHW workflow generation
- multilingual/   — Multilingual reports

Each JSONL line: {"instruction": "...", "output": "..."} or task-specific fields.
""", encoding="utf-8")


def write_sample_jsonl(samples_per_task: int = 10) -> None:
    """Write synthetic sample JSONL per task for smoke testing."""
    for task_key, loader_cls in _task_datasets.TASK_LOADERS.items():
        loader = loader_cls()
        examples = loader.format_training_data()
        if not examples:
            continue
        dir_name = TASK_DIRS.get(task_key, task_key)
        out_dir = DATA_ROOT / dir_name
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / "sample.jsonl"
        written = 0
        with open(out_file, "w", encoding="utf-8") as f:
            while written < samples_per_task:
                for ex in examples:
                    f.write(json.dumps(ex, ensure_ascii=False) + "\n")
                    written += 1
                    if written >= samples_per_task:
                        break
        print("Wrote", out_file, "(", written, "lines)")


def main() -> None:
    p = argparse.ArgumentParser(description="HAI-DEF 7-task data prep")
    p.add_argument("--samples", type=int, default=0, help="Write N sample JSONL lines per task (0 = dirs only)")
    args = p.parse_args()
    ensure_dirs()
    print("Data dirs ready at", DATA_ROOT)
    if args.samples > 0:
        write_sample_jsonl(args.samples)
    print("Done.")


if __name__ == "__main__":
    main()
