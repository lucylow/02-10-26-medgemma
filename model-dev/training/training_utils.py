"""
training_utils.py

Utility helpers used by finetune_lora.py and other training scripts.

Provides:
- deterministic seed setting
- dataset loaders for jsonl or HF datasets
- simple tokenization & dataset preparation (text -> model inputs)
- provenance saving helper
- safe directory creation
"""

from __future__ import annotations

import json
import os
import random
from pathlib import Path
from typing import Any, Dict, Optional, Tuple, Union

import numpy as np
import torch
from datasets import Dataset, load_dataset
from transformers import PreTrainedTokenizerBase


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    try:
        torch.cuda.manual_seed_all(seed)
    except Exception:
        pass


def safe_makedir(p: Union[Path, str], exist_ok: bool = True) -> None:
    os.makedirs(str(p), exist_ok=exist_ok)


def load_jsonl_dataset(path_or_hf_id: str) -> Dataset:
    """
    Load dataset from a JSONL file or HF dataset identifier.

    JSONL file expected format: each line is a JSON object, with at least:
      - "prompt" : text input
      - "target" : text target

    If "prompt"/"target" are missing but "observations"/"expected_risk" exist,
    they are mapped to prompt/target for compatibility with screening data.
    Returns a HuggingFace datasets.Dataset
    """
    if os.path.exists(path_or_hf_id):
        # load raw lines to allow mapping observations -> prompt/target
        rows = []
        with open(path_or_hf_id, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                row = json.loads(line)
                if "prompt" not in row and "observations" in row:
                    obs = row["observations"]
                    label = row.get("expected_risk") or row.get("label", "unknown")
                    row["prompt"] = f"Observations: {obs}"
                    row["target"] = str(label)
                rows.append(row)
        if not rows:
            raise ValueError(f"No valid rows in {path_or_hf_id}")
        ds = Dataset.from_list(rows)
    else:
        # assume HF dataset id
        ds = load_dataset(path_or_hf_id)
        if isinstance(ds, dict):
            ds = ds["train"]
    return ds


def prepare_dataset_for_training(
    ds: Dataset,
    tokenizer: PreTrainedTokenizerBase,
    max_input_length: int = 512,
    max_target_length: int = 128,
) -> Dataset:
    """
    Tokenize and format dataset for causal LM Trainer.

    Expects dataset with keys "prompt" and "target".
    Returns tokenized dataset with input_ids and labels (shifted).
    """

    def _preprocess_batch(batch: Dict[str, Any]) -> Dict[str, Any]:
        prompts = batch.get("prompt", [])
        targets = batch.get("target", [])
        inputs = tokenizer(
            prompts,
            truncation=True,
            max_length=max_input_length,
            padding="max_length",
        )
        with tokenizer.as_target_tokenizer():
            labels = tokenizer(
                targets,
                truncation=True,
                max_length=max_target_length,
                padding="max_length",
            )
        # convert label pad token ids to -100 to ignore in loss
        labels_input_ids = labels["input_ids"]
        pad_id = tokenizer.pad_token_id
        labels_input_ids = [
            [(lid if lid != pad_id else -100) for lid in label]
            for label in labels_input_ids
        ]
        return {
            "input_ids": inputs["input_ids"],
            "attention_mask": inputs["attention_mask"],
            "labels": labels_input_ids,
        }

    tokenized = ds.map(
        _preprocess_batch,
        batched=True,
        remove_columns=ds.column_names if hasattr(ds, "column_names") else None,
    )
    return tokenized


def save_provenance(prov: Dict[str, Any], out_path: Union[str, Path]) -> None:
    """
    Save provenance (training metadata) to disk as JSON.
    """
    out_path = Path(out_path)
    safe_makedir(out_path.parent, exist_ok=True)
    with open(str(out_path), "w", encoding="utf-8") as fh:
        json.dump(prov, fh, indent=2, sort_keys=True, default=str)


def make_synthetic_dataset(n: int = 32) -> Dataset:
    """Small helper for smoke testing / synthetic dataset generation."""
    rows = []
    for i in range(n):
        rows.append({
            "prompt": f"Case {i}: parent reports limited vocabulary",
            "target": "Monitor — follow up in 3 months.",
        })
    return Dataset.from_list(rows)
