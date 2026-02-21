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
    """Single annotation → instruction text for MedGemma (PEDIRAD-001 production format)."""
    p = annot.get("patient", {})
    r = annot.get("radiology", {})
    fractures = annot.get("fractures") or []
    action = annot.get("risk_stratification", "routine")
    chw_action = annot.get("chw_action", "routine well_child")
    return f"""### Pediatric Radiology (MedGemma)

HAND X-RAY | Age: {p.get('age_months', 48)}mo {p.get('sex', 'M')}
Bone age req: Greulich-Pyle | Fracture screen: Extremity

{{
  "bone_age_months": {r.get("bone_age_months", 0)},
  "fractures": {json.dumps(fractures)},
  "risk_stratification": "{action}",
  "chw_action": "{chw_action}"
}}"""


def _build_pedirad_unified_instruction(annot: dict) -> str:
    """Build PEDIRAD-001 full prompt from annotation (uses pedirad_task_config if available)."""
    try:
        _parent = Path(__file__).resolve().parent.parent.parent
        import importlib.util
        _spec = importlib.util.spec_from_file_location(
            "pedirad_task_config", _parent / "hai-adaptation" / "pedirad_task_config.py"
        )
        _mod = importlib.util.module_from_spec(_spec)
        _spec.loader.exec_module(_mod)
        return _mod.build_pedirad_prompt(
            age_months=annot.get("patient", {}).get("age_months", 48),
            sex=annot.get("patient", {}).get("sex", "M"),
            weight_kg=annot.get("patient", {}).get("weight_kg", 18.2),
            mechanism=annot.get("mechanism", "Fall"),
            symptoms=annot.get("symptoms", "Swelling, deformity, limited ROM"),
            prior_imaging=annot.get("prior_imaging", "None"),
            quality_score=annot.get("quality_score", 0.92),
        )
    except Exception:
        return _format_instruction(annot)


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


def _target_from_annotation(annot: dict) -> str:
    """Produce PEDIRAD-001 production JSON string from annotation (for training target)."""
    p = annot.get("patient", {})
    r = annot.get("radiology", {})
    out = {
        "patient": {
            "age_months": p.get("age_months", 48),
            "sex": p.get("sex", "M"),
            "weight_kg": p.get("weight_kg", 18.2),
        },
        "radiology": {
            "bone_age_months": r.get("bone_age_months", 0),
            "chronological_age_months": r.get("chronological_age_months", p.get("age_months", 48)),
            "z_score": r.get("z_score", 0),
            "maturity_stage": r.get("maturity_stage", "average"),
        },
        "fractures": annot.get("fractures", []),
        "differentials": annot.get("differentials", []),
        "risk_stratification": annot.get("risk_stratification", "routine"),
        "referral_timeline": annot.get("referral_timeline", "6_months"),
        "icd10": annot.get("icd10", ["Z00.129"]),
        "chw_action": annot.get("chw_action", "routine well_child"),
    }
    return json.dumps(out, indent=2)


def load_pedirad_dataset(
    split: str,
    data_root: str | Path = "data/pedirad-8k",
    include_image_path: bool = True,
    use_pedirad001_prompt: bool = True,
) -> Dataset:
    """
    Load PEDIRAD-8K for instruction tuning (PEDIRAD-001 production format).

    Returns Dataset with:
      - "prompt": PEDIRAD-001 instruction (or short context if use_pedirad001_prompt=False)
      - "target": full production JSON (bone_age, fractures, risk_stratification, chw_action, icd10)
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
            _build_pedirad_unified_instruction(a)
            if use_pedirad001_prompt
            else (
                f"Pediatric hand X-ray | Age: {a.get('patient', {}).get('age_months', 48)}mo "
                f"{a.get('patient', {}).get('sex', 'M')} | Bone age (Greulich-Pyle) and fracture screen."
            )
        )
        target = _target_from_annotation(a)
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
