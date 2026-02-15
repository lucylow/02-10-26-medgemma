"""
Prepare pediatric/medical SFT data for MedGemma QLoRA fine-tuning.

Reads synthetic parquet (or JSONL with input/output) and produces a dataset
with 'text' column in MedGemma chat format (prompt + target).

Usage:
  python training/prepare_sft_data.py --input data/synthetic/v1.0/train.parquet --output data/finetune_sft
  python training/prepare_sft_data.py --input data/raw.jsonl --output data/finetune_sft
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Add project root for imports
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

import datasets
from transformers import AutoTokenizer

from src.data.training_formatter import format_example_for_sft

try:
    from config.settings import settings
    BASE_MODEL = getattr(settings, "MEDGEMMA_MODEL_PATH", "google/medgemma-4b-it")
except ImportError:
    BASE_MODEL = "google/medgemma-4b-it"


def load_records(input_path: str):
    """Load records from parquet or JSONL."""
    path = Path(input_path)
    if not path.exists():
        raise FileNotFoundError(f"Input not found: {path}")

    if path.suffix == ".parquet":
        import pandas as pd
        df = pd.read_parquet(path)
        return [row.to_dict() for _, row in df.iterrows()]

    if path.suffix == ".jsonl":
        import json
        records = []
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    records.append(json.loads(line))
        return records

    raise ValueError(f"Unsupported format: {path.suffix}. Use .parquet or .jsonl")


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare SFT data for MedGemma QLoRA")
    parser.add_argument("--input", "-i", required=True, help="Input parquet or JSONL")
    parser.add_argument("--output", "-o", default="data/finetune_sft", help="Output dataset path")
    parser.add_argument("--model", default=BASE_MODEL, help="Model name for tokenizer (chat template)")
    parser.add_argument("--max-samples", type=int, default=None, help="Limit samples (for debugging)")
    args = parser.parse_args()

    records = load_records(args.input)
    if args.max_samples:
        records = records[: args.max_samples]
    print(f"Loaded {len(records)} records")

    tokenizer = AutoTokenizer.from_pretrained(args.model, trust_remote_code=True)
    formatted = [format_example_for_sft(r, tokenizer) for r in records]

    ds = datasets.Dataset.from_list(formatted)
    split = ds.train_test_split(test_size=0.1, seed=42)
    ds_dict = datasets.DatasetDict({"train": split["train"], "validation": split["test"]})

    out_path = Path(args.output)
    out_path.mkdir(parents=True, exist_ok=True)
    ds_dict.save_to_disk(str(out_path))
    print(f"Saved to {out_path} (train={len(split['train'])}, val={len(split['test'])})")


if __name__ == "__main__":
    main()
