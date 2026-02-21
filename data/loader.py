"""
Dataset loaders for PediScreen: JSONL/CSV with schema validation.

Provides robust readers, sanity checks, and optional embedding column handling.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterator, List, Optional

import pandas as pd

from data.schema import CaseRecord, validate_label


def load_jsonl(path: str | Path) -> Iterator[CaseRecord]:
    """Load JSONL file and yield validated CaseRecord instances."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                raw = json.loads(line)
                record = CaseRecord(
                    case_id=raw.get("case_id", f"row_{i}"),
                    age_months=raw["age_months"],
                    observations=raw["observations"],
                    asq_scores=raw.get("asq_scores"),
                    image_path=raw.get("image_path"),
                    label=raw.get("label") or raw.get("expected_risk"),
                    consent=raw.get("consent"),
                    domain=raw.get("domain"),
                    structured_scores=raw.get("structured_scores"),
                    image_description=raw.get("image_description"),
                    expected_risk=raw.get("expected_risk"),
                    expected_rationale=raw.get("expected_rationale"),
                    confidence_threshold=raw.get("confidence_threshold"),
                    priority=raw.get("priority"),
                )
                yield record
            except Exception as e:
                raise ValueError(f"Invalid record at line {i} in {path}: {e}") from e


def load_jsonl_list(path: str | Path) -> List[CaseRecord]:
    """Load full JSONL file into a list of CaseRecord."""
    return list(load_jsonl(path))


def load_csv(path: str | Path) -> List[CaseRecord]:
    """Load CSV with expected columns: case_id, age_months, observations, [label]."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")
    df = pd.read_csv(path)
    required = {"case_id", "age_months", "observations"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"CSV missing columns: {missing}")
    records = []
    for _, row in df.iterrows():
        label = None
        if "label" in df.columns and pd.notna(row.get("label")):
            label = str(row["label"])
        elif "expected_risk" in df.columns and pd.notna(row.get("expected_risk")):
            label = str(row["expected_risk"])
        asq = None
        if "asq_scores" in df.columns and pd.notna(row.get("asq_scores")):
            v = row["asq_scores"]
            asq = json.loads(v) if isinstance(v, str) else v
        records.append(
            CaseRecord(
                case_id=str(row["case_id"]),
                age_months=int(row["age_months"]),
                observations=str(row["observations"]),
                label=label,
                asq_scores=asq,
            )
        )
    return records


def sanity_check(records: List[CaseRecord]) -> dict[str, Any]:
    """Run sanity checks; return dict with counts and issues."""
    n = len(records)
    if n == 0:
        return {"count": 0, "errors": ["No records"], "valid_labels": 0}
    ids = [r.case_id for r in records]
    duplicate_ids = [x for x in ids if ids.count(x) > 1]
    unique_dup = list(dict.fromkeys(duplicate_ids))
    valid_labels = sum(1 for r in records if validate_label(r.resolved_label()))
    return {
        "count": n,
        "valid_labels": valid_labels,
        "duplicate_case_ids": unique_dup,
        "errors": [] if not unique_dup else [f"Duplicate case_id: {unique_dup}"],
    }
