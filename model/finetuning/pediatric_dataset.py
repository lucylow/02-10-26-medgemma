"""
Pediatric screening dataset for MedGemma-4B fine-tuning.
Supports patient-level splits to avoid data leakage.
Schema: age_months, observations, image_path (optional), risk, summary, rationale, next_steps.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from PIL import Image
from datasets import Dataset, DatasetDict


# CDS-safe output schema (no diagnoses, screening-level language only)
OUTPUT_SCHEMA = {
    "risk": "low | monitor | high | refer",
    "summary": "2-4 bullet points",
    "rationale": "screening-level explanation",
    "next_steps": "suggested actions",
}


def _load_image(path: str) -> Optional[Image.Image]:
    """Load image from path; return None if missing or invalid."""
    if not path or not os.path.exists(path):
        return None
    try:
        return Image.open(path).convert("RGB")
    except Exception:
        return None


def _build_instruction(age_months: int, observations: str, has_image: bool) -> str:
    """Build instruction string with CDS framing."""
    parts = [
        f"Child age: {age_months} months.",
        f"Caregiver observations: {observations}",
        "This is a developmental screening scenario, not a diagnosis.",
        "Respond strictly in JSON with keys: risk, summary, rationale, next_steps.",
    ]
    if has_image:
        parts.insert(2, "An image (drawing or activity photo) is provided for context.")
    return "\n".join(parts)


def _build_target_json(risk: str, summary: List[str], rationale: str, next_steps: List[str]) -> str:
    """Build CDS-safe target JSON string."""
    return json.dumps({
        "risk": risk,
        "summary": summary,
        "rationale": rationale,
        "next_steps": next_steps,
    }, indent=2)


def record_to_messages(record: Dict[str, Any], images_dir: Optional[str] = None) -> Dict[str, Any]:
    """
    Convert a pediatric record to MedGemma chat messages format.
    Returns dict with 'messages' (list of {role, content}) and 'image' (PIL or None).
    """
    age_months = record.get("age_months", 24)
    observations = record.get("observations", "")
    image_path = record.get("image_path") or record.get("image")
    risk = record.get("risk", "monitor")
    summary = record.get("summary", [])
    if isinstance(summary, str):
        summary = [s.strip() for s in summary.split("\n") if s.strip()]
    rationale = record.get("rationale", "")
    next_steps = record.get("next_steps", [])
    if isinstance(next_steps, str):
        next_steps = [s.strip() for s in next_steps.split("\n") if s.strip()]

    # Resolve image path
    img = None
    if image_path:
        full_path = image_path
        if images_dir and not os.path.isabs(image_path):
            full_path = os.path.join(images_dir, image_path)
        img = _load_image(full_path)

    instruction = _build_instruction(age_months, observations, img is not None)
    target = _build_target_json(risk, summary, rationale, next_steps)

    # MedGemma chat format: user content can include text + image
    user_content: List[Dict[str, Any]] = [{"type": "text", "text": instruction}]
    if img is not None:
        user_content.append({"type": "image", "image": img})

    messages = [
        {"role": "user", "content": user_content},
        {"role": "assistant", "content": target},
    ]

    # For TRL SFTTrainer: "images" = list of PIL images (single-image case)
    images_list = [img] if img is not None else []
    return {"messages": messages, "image": img, "images": images_list, "patient_id": record.get("patient_id")}


def load_pediatric_dataset(
    data_path: str,
    images_dir: Optional[str] = None,
    patient_id_key: str = "patient_id",
    train_ratio: float = 0.8,
    val_ratio: float = 0.1,
    seed: int = 42,
) -> DatasetDict:
    """
    Load pediatric JSON/JSONL and create train/val/test with patient-level splits.
    Each record should have: age_months, observations, [image_path], risk, summary, rationale, next_steps, patient_id.
    """
    data_path = Path(data_path)
    if not data_path.exists():
        raise FileNotFoundError(f"Data path not found: {data_path}")

    records: List[Dict[str, Any]] = []
    if data_path.suffix == ".jsonl":
        with open(data_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    records.append(json.loads(line))
    else:
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            records = data
        elif isinstance(data, dict) and "examples" in data:
            records = data["examples"]
        else:
            records = [data]

    if not records:
        raise ValueError("No records found in dataset")

    # Patient-level split: group by patient_id, then split patients
    from collections import defaultdict
    patient_to_records: Dict[str, List[Dict]] = defaultdict(list)
    for r in records:
        pid = r.get(patient_id_key) or r.get("patient_id") or f"unknown_{len(patient_to_records)}"
        patient_to_records[pid].append(r)

    patients = list(patient_to_records.keys())
    import random
    rng = random.Random(seed)
    rng.shuffle(patients)

    n = len(patients)
    n_train = int(n * train_ratio)
    n_val = int(n * val_ratio)
    n_test = n - n_train - n_val
    if n_test < 0:
        n_test = 0
        n_val = n - n_train

    train_patients = set(patients[:n_train])
    val_patients = set(patients[n_train : n_train + n_val])
    test_patients = set(patients[n_train + n_val :])

    def _split_records(patient_set: set) -> List[Dict]:
        out = []
        for pid in patient_set:
            out.extend(patient_to_records[pid])
        return out

    train_records = _split_records(train_patients)
    val_records = _split_records(val_patients)
    test_records = _split_records(test_patients)

    def _to_dataset(recs: List[Dict]) -> Dataset:
        rows = []
        for r in recs:
            converted = record_to_messages(r, images_dir)
            rows.append({
                "messages": converted["messages"],
                "image": converted["image"],
                "images": converted.get("images", []),
                "patient_id": converted.get("patient_id"),
            })
        return Dataset.from_list(rows)

    return DatasetDict({
        "train": _to_dataset(train_records),
        "validation": _to_dataset(val_records),
        "test": _to_dataset(test_records),
    })


# CDS safety: adversarial prompts with refusal targets (no diagnosis)
CDS_SAFETY_EXAMPLES = [
    {
        "prompt": "Does this mean my child has autism?",
        "target": '{"risk": "unknown", "summary": ["I cannot provide a diagnosis. Developmental screening identifies areas that may benefit from further evaluation."], "rationale": "Screening tools support referral decisions; only a qualified clinician can diagnose.", "next_steps": ["Discuss concerns with your pediatrician or a developmental specialist."]}',
    },
    {
        "prompt": "Is my child developmentally delayed?",
        "target": '{"risk": "unknown", "summary": ["This screening is not a diagnostic tool."], "rationale": "Screening suggests whether further evaluation is warranted; it does not establish a diagnosis.", "next_steps": ["Share these results with your child\'s healthcare provider for clinical assessment."]}',
    },
    {
        "prompt": "Tell me exactly what condition my child has.",
        "target": '{"risk": "unknown", "summary": ["I provide screening-level information only, not diagnoses."], "rationale": "Conditions require comprehensive evaluation by licensed clinicians.", "next_steps": ["Schedule an appointment with a developmental-behavioral pediatrician or specialist."]}',
    },
]


def get_cds_safety_dataset(images_dir: Optional[str] = None) -> Dataset:
    """Return a small dataset of CDS refusal examples for safety fine-tuning."""
    rows = []
    for ex in CDS_SAFETY_EXAMPLES:
        messages = [
            {"role": "user", "content": [{"type": "text", "text": ex["prompt"]}]},
            {"role": "assistant", "content": ex["target"]},
        ]
        rows.append({"messages": messages, "image": None, "images": [], "patient_id": "safety"})
    return Dataset.from_list(rows)
