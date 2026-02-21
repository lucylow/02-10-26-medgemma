"""
radiology_processor.py

Production dataset for MedGemma-4B radiology fine-tuning: Bone Age, ROP, Fractures.
Unified PediatricRadiologyDataset with task-specific prompts and MedGemma processor.

Dataset structure (pedirad-custom):
  pedirad-custom/
  ├── bone_age/       train/, val/, test/ + {split}_annotations.json
  ├── rop_screening/  zone_i_stage2/, zone_ii_stage1/, normal_pupil/ + annotations
  ├── fractures/      distal_radius/, buckle/, normal/ + annotations
  └── annotations/    (alternative) {split}_annotations.json with image_path, task, labels

Usage:
  from model_dev.training.radiology_processor import PediatricRadiologyDataset, build_radiology_prompt
  ds = PediatricRadiologyDataset("./pedirad-custom", split="train", max_samples=8000)
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from PIL import Image

# Optional: torch for Dataset base; transformers for processor
try:
    from torch.utils.data import Dataset
except ImportError:
    Dataset = None  # type: ignore

try:
    from transformers import AutoProcessor
except ImportError:
    AutoProcessor = None  # type: ignore


# ---------------------------------------------------------------------------
# Task-specific prompt builders (Greulich-Pyle, ROP Zone/Stage/Plus, Fracture)
# ---------------------------------------------------------------------------

def build_bone_age_prompt(annot: Dict[str, Any]) -> str:
    """Bone age (Greulich-Pyle) instruction + JSON target template."""
    age_months = annot.get("age_months", annot.get("chronological_age_months", 24))
    sex = annot.get("sex", "M")
    return f"""### Pediatric Radiology Assistant (MedGemma-4B-IT)

RADIOLOGY STUDY: Hand/wrist X-ray (PA view)
PATIENT: {age_months}mo {sex}
CLINICAL QUESTION: Bone age assessment (Greulich-Pyle)

Provide JSON prediction only:
{{
  "bone_age_months": <float>,
  "chronological_age_months": {age_months},
  "z_score": <float>,
  "confidence": <0-1>,
  "icd10": ["Z00.129"]
}}"""


def build_rop_prompt(annot: Dict[str, Any]) -> str:
    """ROP screening: Zone I–III, Stage 1–3, Plus disease."""
    eye = annot.get("eye", "right")
    ga_weeks = annot.get("ga_weeks", annot.get("gestational_age_weeks", 32))
    postnatal_days = annot.get("postnatal_days", annot.get("pma_weeks", 36))
    return f"""### ROP Screening (MedGemma-4B-IT)

FUNDUS IMAGE: {eye} eye dilated pupil
GESTATIONAL AGE: {ga_weeks}wks postnatal {postnatal_days}d

Provide JSON diagnosis:
{{
  "zone": "I|II|III",
  "stage": 1|2|3|"none",
  "plus_disease": true|false,
  "confidence": <0-1>
}}"""


def build_fracture_prompt(annot: Dict[str, Any]) -> str:
    """Fracture detection (distal radius, buckle, normal)."""
    age_months = annot.get("age_months", 60)
    sex = annot.get("sex", "M")
    return f"""### Pediatric Radiology — Fracture Screen (MedGemma-4B-IT)

EXTREMITY X-RAY | Age: {age_months}mo {sex}
TASK: Fracture detection (distal radius, buckle, or normal).

Provide JSON only:
{{
  "fracture_present": true|false,
  "type": "distal_radius|buckle|none",
  "confidence": <0-1>,
  "action": "routine|refer"
}}"""


def build_pedirad_unified_prompt(annot: Dict[str, Any]) -> str:
    """
    PEDIRAD-001: Multi-label pediatric fracture + bone age (CHW production).
    Uses prompt template from hai-adaptation/pedirad_task_config.
    """
    try:
        from hai_adaptation.pedirad_task_config import build_pedirad_prompt
    except ImportError:
        _parent = Path(__file__).resolve().parent.parent.parent
        import importlib.util
        _spec = importlib.util.spec_from_file_location(
            "pedirad_task_config",
            _parent / "hai-adaptation" / "pedirad_task_config.py",
        )
        _mod = importlib.util.module_from_spec(_spec)
        _spec.loader.exec_module(_mod)
        build_pedirad_prompt = _mod.build_pedirad_prompt

    p = annot.get("patient", {})
    age_months = p.get("age_months", annot.get("age_months", 48))
    sex = p.get("sex", annot.get("sex", "M"))
    weight_kg = p.get("weight_kg", 18.2)
    return build_pedirad_prompt(
        age_months=age_months,
        sex=sex,
        weight_kg=weight_kg,
        mechanism=annot.get("mechanism", "Fall"),
        symptoms=annot.get("symptoms", "Swelling, deformity, limited ROM"),
        prior_imaging=annot.get("prior_imaging", "None"),
        quality_score=annot.get("quality_score", annot.get("image_quality", 0.92)),
    )


def build_radiology_prompt(annot: Dict[str, Any]) -> str:
    """Dispatch to task-specific prompt by annot['task'] or path hints."""
    task = (annot.get("task") or "").lower()
    if "pedirad" in task or task == "pedirad_001":
        return build_pedirad_unified_prompt(annot)
    if "bone_age" in task or "bone age" in task:
        return build_bone_age_prompt(annot)
    if "rop" in task or "retinopathy" in task:
        return build_rop_prompt(annot)
    if "fracture" in task:
        return build_fracture_prompt(annot)
    # Default: bone age (most common in PediRad)
    return build_bone_age_prompt(annot)


# ---------------------------------------------------------------------------
# Annotation loading: support multiple layouts
# ---------------------------------------------------------------------------

def load_radiology_annotations(
    data_dir: Union[str, Path],
    split: str,
    max_samples: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Load annotations for a split. Tries:
      1) data_dir/annotations/{split}_annotations.json
      2) data_dir/{split}_annotations.json
      3) data_dir/bone_age/{split}_annotations.json (and merge from rop_screening, fractures if present)
    Each item must have: image_path (relative to data_dir or absolute), and task-specific keys.
    """
    root = Path(data_dir)
    candidates = [
        root / "annotations" / f"{split}_annotations.json",
        root / f"{split}_annotations.json",
    ]
    all_annotations: List[Dict[str, Any]] = []

    for path in candidates:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            all_annotations = data if isinstance(data, list) else data.get("annotations", [data])
            # Normalize PediRad-8K format (patient/radiology) to flat annot
            normalized = []
            for a in all_annotations:
                if "patient" in a and "radiology" in a:
                    p, r = a["patient"], a["radiology"]
                    normalized.append({
                        "image_path": a.get("image_path", ""),
                        "task": "bone_age",
                        "age_months": p.get("age_months", 24),
                        "sex": p.get("sex", "M"),
                        "bone_age_months": r.get("bone_age_months"),
                        "fractures": a.get("fractures", []),
                        "risk_stratification": a.get("risk_stratification", "routine"),
                        **a,
                    })
                else:
                    normalized.append(a)
            all_annotations = normalized
            break

    if not all_annotations:
        # Per-task folders: bone_age/train, etc.
        for task_folder in ("bone_age", "rop_screening", "fractures"):
            task_dir = root / task_folder / split
            ann_path = root / task_folder / f"{split}_annotations.json"
            if ann_path.exists():
                with open(ann_path, "r", encoding="utf-8") as f:
                    task_ann = json.load(f)
                task_list = task_ann if isinstance(task_ann, list) else task_ann.get("annotations", [])
                for a in task_list:
                    a.setdefault("task", task_folder)
                    if "image_path" not in a and a.get("image_id"):
                        a["image_path"] = str(task_dir / f"{a['image_id']}.jpg")
                all_annotations.extend(task_list)

    if max_samples is not None and len(all_annotations) > max_samples:
        all_annotations = all_annotations[: max_samples]
    return all_annotations


# ---------------------------------------------------------------------------
# PediatricRadiologyDataset (PyTorch)
# ---------------------------------------------------------------------------

class PediatricRadiologyDataset(Dataset if Dataset is not None else object):  # type: ignore
    """
    Vision-language dataset for MedGemma radiology fine-tuning.
    Returns input_ids, attention_mask, labels (for causal LM), and metadata.
    """

    def __init__(
        self,
        data_dir: Union[str, Path],
        split: str = "train",
        max_samples: Optional[int] = None,
        processor_name: str = "google/medgemma-4b-it",
        max_length: int = 2048,
        trust_remote_code: bool = True,
    ):
        self.data_dir = Path(data_dir)
        self.split = split
        self.max_length = max_length
        self.annotations = load_radiology_annotations(self.data_dir, split, max_samples)

        if AutoProcessor is None:
            raise ImportError("transformers is required: pip install transformers")
        self.processor = AutoProcessor.from_pretrained(
            processor_name,
            trust_remote_code=trust_remote_code,
        )
        if getattr(self.processor, "tokenizer", None) and getattr(self.processor.tokenizer, "pad_token", None) is None:
            self.processor.tokenizer.pad_token = self.processor.tokenizer.eos_token

    def __len__(self) -> int:
        return len(self.annotations)

    def _resolve_image_path(self, annot: Dict[str, Any]) -> Path:
        """Resolve image path relative to data_dir or task subdir."""
        raw = annot.get("image_path") or annot.get("image_id") or ""
        if not raw:
            raise ValueError(f"Annotation missing image_path/image_id: {annot.get('id', annot)}")
        p = Path(raw)
        if p.is_absolute() and p.exists():
            return p
        # Try data_dir / image_path (and processed/train, etc. for PediRad-8K)
        full = self.data_dir / raw
        if full.exists():
            return full
        for prefix in ("processed", "bone_age", "rop_screening", "fractures"):
            alt = self.data_dir / prefix / self.split / p.name
            if alt.exists():
                return alt
            alt = self.data_dir / prefix / raw
            if alt.exists():
                return alt
        # Try task subdirs
        for sub in ("bone_age", "rop_screening", "fractures"):
            for spl in (self.split, "train", "val", "test"):
                candidate = self.data_dir / sub / spl / p.name
                if candidate.exists():
                    return candidate
        return self.data_dir / raw

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        annot = self.annotations[idx]
        image_path = self._resolve_image_path(annot)
        image = Image.open(image_path).convert("RGB")

        prompt = build_radiology_prompt(annot)
        inputs = self.processor(
            text=prompt,
            images=image,
            return_tensors="pt",
            padding="max_length",
            truncation=True,
            max_length=self.max_length,
        )

        input_ids = inputs["input_ids"].squeeze(0)
        attention_mask = inputs.get("attention_mask")
        if attention_mask is not None:
            attention_mask = attention_mask.squeeze(0)
        else:
            attention_mask = (input_ids != self.processor.tokenizer.pad_token_id).long()

        # Causal LM: labels = input_ids (or -100 for prompt-only if you mask prompt; here we use full seq)
        labels = input_ids.clone()
        pad_id = getattr(self.processor.tokenizer, "pad_token_id", None) or 0
        labels[labels == pad_id] = -100

        return {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
            "labels": labels,
            "metadata": annot,
        }


# ---------------------------------------------------------------------------
# HuggingFace Dataset builder (for Trainer compatibility)
# ---------------------------------------------------------------------------

def radiology_annotations_to_hf_dataset(
    data_dir: Union[str, Path],
    split: str,
    max_samples: Optional[int] = None,
) -> "Dataset":
    """Load annotations only into a HF Dataset (prompt, image_path, task, etc.) for custom collation elsewhere."""
    from datasets import Dataset as HFDataset
    annotations = load_radiology_annotations(data_dir, split, max_samples)
    rows = []
    root = Path(data_dir)
    for a in annotations:
        image_path = a.get("image_path") or a.get("image_id", "")
        if image_path and not Path(image_path).is_absolute():
            image_path = str(root / image_path)
        rows.append({
            "prompt": build_radiology_prompt(a),
            "image_path": image_path,
            "task": a.get("task", "bone_age"),
            "annotation": a,
        })
    return HFDataset.from_list(rows)


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description="List radiology annotations (dry run)")
    p.add_argument("data_dir", default="pedirad-custom", nargs="?")
    p.add_argument("--split", default="train")
    p.add_argument("--max_samples", type=int, default=10)
    args = p.parse_args()
    ann = load_radiology_annotations(args.data_dir, args.split, args.max_samples)
    print(f"Split {args.split}: {len(ann)} annotations")
    if ann:
        print("Sample keys:", list(ann[0].keys()))
