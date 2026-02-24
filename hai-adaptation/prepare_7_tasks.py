"""
Prepare 7-task HAI-DEF dataset from data/hai-pediatric: load, validate, split, save as HF dataset.
Run from repo root: PYTHONPATH=hai-adaptation python hai-adaptation/prepare_7_tasks.py
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

_here = Path(__file__).resolve().parent
if _here.name == "hai-adaptation" and str(_here) not in sys.path:
    sys.path.insert(0, str(_here))

from task_datasets import get_task_builders, TASK_DATA_SUBDIRS


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare 7-task HAI-DEF dataset")
    parser.add_argument("--input-root", default="data/hai-pediatric", help="Root for asq3_scoring, rop_detection, etc.")
    parser.add_argument("--output-dataset", default="data/hai-pediatric/hai_7_task_dataset", help="Output HF dataset path")
    parser.add_argument("--train-ratio", type=float, default=0.9)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    data_root = Path(args.input_root)
    data_root.mkdir(parents=True, exist_ok=True)

    builders = get_task_builders()
    all_records = []
    for task_name in list(builders.keys()):
        if task_name not in builders:
            continue
        builder = builders[task_name]()
        task_dir = data_root / TASK_DATA_SUBDIRS.get(task_name, task_name)
        records = builder.build(data_root=task_dir)
        all_records.extend(records)

    if not all_records:
        for task_name in builders:
            builder = builders[task_name]()
            records = builder.build()
            all_records.extend(records)

    if not all_records:
        print("No records found. Add JSONL under data/hai-pediatric/<subdir>/ or use built-in examples only.")
        return

    from datasets import Dataset, DatasetDict
    full = Dataset.from_list(all_records)
    split = full.train_test_split(test_size=1.0 - args.train_ratio, seed=args.seed)
    ds = DatasetDict({"train": split["train"], "validation": split["test"]})
    out_path = Path(args.output_dataset)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    ds.save_to_disk(str(out_path))
    print(f"Saved dataset with {full.num_rows} rows to {out_path}")
    print(f"  train: {split['train'].num_rows}, validation: {split['test'].num_rows}")


if __name__ == "__main__":
    main()
