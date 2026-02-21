"""
pedirad_loader.py

Load PEDIRAD-8K annotations and produce LoRA-ready datasets:
- HuggingFace Dataset with prompt/target (and optional image_path for VLM).
- JSONL export for text-only finetune_lora.py.

Usage:
  from model_dev.training.pedirad_loader import load_pedirad_dataset, export_pedirad_jsonl
  ds = load_pedirad_dataset("train", data_root="data/pedirad-8k")
  export_pedirad_jsonl("data/pedirad-8k", "data/pedirad-8k/train.jsonl", split="train")
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import List, Optional

from datasets import Dataset


def _format_instruction(annot: dict) -> str:
    """Single annotation → instruction text for MedGemma (pediatric radiology)."""
    p = annot["patient"]
    r = annot["radiology"]
    fractures = annot.get("fractures") or []
    action = annot.get("risk_stratification", "routine")
    return f"""### Pediatric Radiology (MedGemma)

HAND X-RAY | Age: {p['age_months']}mo {p['sex']}
Bone age req: Greulich-Pyle | Fracture screen: Extremity

{{
  "bone_age_months": {r["bone_age_months"]},
  "fractures": {json.dumps(fractures)},
  "action": "{action}"
}}"""


def load_pedirad_annotations(
    split: str,
    data_root: str | Path,
) -> List[dict]:
    """Load annotation list for a split from data_root/annotations/{split}_annotations.json."""
    root = Path(data_root)
    path = root / "annotations" / f"{split}_annotations.json"
    if not path.exists():
        raise FileNotFoundError(f"PEDIRAD annotations not found: {path}")
    with open(path) as f:
        return json.load(f)


def load_pedirad_dataset(
    split: str,
    data_root: str | Path = "data/pedirad-8k",
    include_image_path: bool = True,
) -> Dataset:
    """
    Load PEDIRAD-8K for instruction tuning.

    Returns Dataset with:
      - "prompt": short context line (age, sex, task)
      - "target": full JSON-style answer (bone_age, fractures, action)
      - "image_path": (optional) path to 512×512 JPG for VLM training
    """
    annotations = load_pedirad_annotations(split, data_root)
    root = Path(data_root)
    rows = []
    for a in annotations:
        img_path = a.get("image_path", "")
        if img_path and not Path(img_path).is_absolute():
            img_path = str(Path(img_path))
        prompt = (
            f"Pediatric hand X-ray | Age: {a['patient']['age_months']}mo {a['patient']['sex']} | "
            "Bone age (Greulich-Pyle) and fracture screen."
        )
        target = _format_instruction(a)
        row = {"prompt": prompt, "target": target}
        if include_image_path:
            row["image_path"] = img_path
        rows.append(row)
    return Dataset.from_list(rows)


def export_pedirad_jsonl(
    data_root: str | Path,
    output_path: str | Path,
    split: str = "train",
    include_image_path: bool = True,
) -> None:
    """
    Export PEDIRAD split to JSONL with prompt/target (and optional image_path).
    Use with finetune_lora.py --dataset_path <output_path> for text-only LoRA.
    """
    ds = load_pedirad_dataset(split, data_root=data_root, include_image_path=include_image_path)
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w") as f:
        for row in ds:
            rec = {"prompt": row["prompt"], "target": row["target"]}
            if include_image_path and row.get("image_path"):
                rec["image_path"] = row["image_path"]
            f.write(json.dumps(rec) + "\n")
    return


def format_instruction(annot: dict) -> str:
    """Alias for _format_instruction (used in docs)."""
    return _format_instruction(annot)


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description="Export PEDIRAD-8K split to JSONL for LoRA")
    p.add_argument("--data_root", default="data/pedirad-8k", help="PEDIRAD output root")
    p.add_argument("--split", default="train")
    p.add_argument("--output", default=None, help="Output JSONL path (default: <data_root>/<split>.jsonl)")
    p.add_argument("--no_image_path", action="store_true", help="Omit image_path in JSONL")
    args = p.parse_args()
    output = args.output or str(Path(args.data_root) / f"{args.split}.jsonl")
    export_pedirad_jsonl(
        args.data_root,
        output,
        split=args.split,
        include_image_path=not args.no_image_path,
    )
    print("Wrote", output)
