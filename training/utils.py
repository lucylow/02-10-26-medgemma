"""
Training utilities: collation, dataloader builders for MedGemma LoRA.

Supports text-only (parquet/HF) and optional text+embedding+label from JSONL.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable, Dict, Iterator, List, Optional

import torch
from torch.utils.data import Dataset


def collate_causal_lm(
    tokenizer,
    max_length: int = 512,
    pad_to_multiple_of: Optional[int] = None,
) -> Callable:
    """Collate batch: tokenize texts, set labels (mask padding with -100)."""

    def _collate(batch: List[Dict[str, Any]]) -> Dict[str, torch.Tensor]:
        texts = [b["text"] for b in batch]
        enc = tokenizer(
            texts,
            padding="longest",
            truncation=True,
            max_length=max_length,
            return_tensors="pt",
            pad_to_multiple_of=pad_to_multiple_of,
        )
        labels = enc["input_ids"].clone()
        pad_id = tokenizer.pad_token_id or tokenizer.eos_token_id
        if pad_id is not None:
            labels[labels == pad_id] = -100
        enc["labels"] = labels
        return enc

    return _collate


class JsonlTextDataset(Dataset):
    """Dataset from JSONL with 'text' (and optional 'label') for causal LM.
    Builds 'text' from observations + label if needed.
    """

    def __init__(
        self,
        path: str | Path,
        max_samples: Optional[int] = None,
        text_key: str = "text",
        prompt_template: Optional[str] = None,
    ):
        self.path = Path(path)
        self.text_key = text_key
        self.prompt_template = prompt_template or "Observations: {observations}\nRisk: {label}"
        self.samples: List[Dict[str, Any]] = []
        with open(self.path, "r", encoding="utf-8") as f:
            for i, line in enumerate(f):
                if max_samples is not None and i >= max_samples:
                    break
                line = line.strip()
                if not line:
                    continue
                self.samples.append(json.loads(line))
        # Build text from observations + label if text_key missing
        for s in self.samples:
            if text_key not in s and "observations" in s:
                label = s.get("label") or s.get("expected_risk") or "unknown"
                s[text_key] = self.prompt_template.format(
                    observations=s["observations"],
                    label=label,
                )

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, i: int) -> Dict[str, Any]:
        return self.samples[i]


def load_jsonl_for_training(
    path: str | Path,
    max_samples: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Load JSONL and ensure each row has 'text' for Trainer."""
    ds = JsonlTextDataset(path, max_samples=max_samples)
    return ds.samples
