"""
HAI-DEF 7-task dataset builders for MedGemma-4B-IT instruction tuning.
Each builder loads from data/hai-pediatric/<task>/ and emits records:
  { "task_name", "instruction", "output", "image_path" (optional) }
"""

from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from datasets import Dataset
except ImportError:
    Dataset = None  # type: ignore


def _load_jsonl_or_empty(path: Path) -> List[Dict[str, Any]]:
    """Load JSONL if file exists; else return empty list."""
    if not path.exists():
        return []
    import json
    out = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return out


def _ensure_task_record(
    task_name: str,
    instruction: str,
    output: str,
    image_path: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "task_name": task_name,
        "instruction": instruction,
        "output": output,
        "image_path": image_path or "",
    }


class ASQ3Scorer:
    """Adapt HAI-DEF MedGemma to ASQ-3 JSON risk stratification (24mo)."""

    TASK_NAME = "asq3"
    DEFAULT_DATA_DIR = "data/hai-pediatric/asq3_scoring"

    def format_training_data(self) -> List[Dict[str, Any]]:
        """Convert CHW observations into instruction → JSON pairs."""
        return [
            _ensure_task_record(
                self.TASK_NAME,
                """### Pediatric Screening (24mo F)
CHW Observation: "15 single words, no combinations, points only"
Milestones missed: 50+ words, 2-word phrases
Parental concern: Regression from 18mo eval

ASQ-3 domains (0-60): Communication=18/60, Motor=42/60
""",
                """{
  "risk_level": "referral",
  "confidence": 0.97,
  "asq3_composite": 28,
  "asq3_max": 60,
  "percentile": "3rd",
  "icd10": ["F80.9", "R62.51"],
  "action": ["Immediate SLP eval", "Audiology within 7 days"],
  "followup_days": 7
}""",
            ),
        ]

    def build(self, data_root: Optional[Path] = None) -> List[Dict[str, Any]]:
        """Load from data root and merge with built-in examples."""
        root = Path(data_root or self.DEFAULT_DATA_DIR)
        records = self.format_training_data()
        for p in root.glob("**/*.jsonl"):
            for row in _load_jsonl_or_empty(p):
                if "instruction" in row and "output" in row:
                    records.append(
                        _ensure_task_record(
                            self.TASK_NAME,
                            row["instruction"],
                            row["output"] if isinstance(row["output"], str) else __import__("json").dumps(row["output"]),
                            row.get("image_path"),
                        )
                    )
        return records


class ROPDetector:
    """ROP Zone I–III, Stage 1–3, Plus disease (target Zone I sensitivity 97%)."""

    TASK_NAME = "rop"
    DEFAULT_DATA_DIR = "data/hai-pediatric/rop_detection"

    def format_rop_data(self) -> List[Dict[str, Any]]:
        """Example ROP instruction → JSON pairs."""
        return [
            _ensure_task_record(
                self.TASK_NAME,
                """### ROP Screening (32wks GA, 4wks postnatal)
Fundus photo: Dilated pupil, temporal avascular zone
Vascular tortuosity: Mild-moderate ridge Stage 2
Plus disease: Absent""",
                """{
  "zone": "II",
  "stage": 2,
  "plus_disease": false,
  "risk_level": "urgent",
  "confidence": 0.94,
  "treatment": "Laser if progression or plus disease develops",
  "followup_days": 3
}""",
                image_path="",
            ),
        ]

    def build(self, data_root: Optional[Path] = None) -> List[Dict[str, Any]]:
        root = Path(data_root or self.DEFAULT_DATA_DIR)
        records = self.format_rop_data()
        for p in root.glob("**/*.jsonl"):
            for row in _load_jsonl_or_empty(p):
                if "instruction" in row and "output" in row:
                    records.append(
                        _ensure_task_record(
                            self.TASK_NAME,
                            row["instruction"],
                            row["output"] if isinstance(row["output"], str) else __import__("json").dumps(row["output"]),
                            row.get("image_path"),
                        )
                    )
        return records


class BoneAgeAssessor:
    """Greulich–Pyle bone age (target MAE ±2.6 months)."""

    TASK_NAME = "bone_age"
    DEFAULT_DATA_DIR = "data/hai-pediatric/bone_age"

    def format_bone_age_data(self) -> List[Dict[str, Any]]:
        return [
            _ensure_task_record(
                self.TASK_NAME,
                """### Hand X-ray (PA view)
Chronological age: 30 months M
Bone age standard: Greulich-Pyle
Image quality: 0.92 (excellent)""",
                """{
  "bone_age_months": 26.8,
  "chronological_age_months": 30.0,
  "z_score": -1.4,
  "confidence": 0.96,
  "maturity_stage": "late_average",
  "endocrine_referral": false,
  "icd10": ["Z00.129"]
}""",
            ),
        ]

    def build(self, data_root: Optional[Path] = None) -> List[Dict[str, Any]]:
        root = Path(data_root or self.DEFAULT_DATA_DIR)
        records = self.format_bone_age_data()
        for p in root.glob("**/*.jsonl"):
            for row in _load_jsonl_or_empty(p):
                if "instruction" in row and "output" in row:
                    records.append(
                        _ensure_task_record(
                            self.TASK_NAME,
                            row["instruction"],
                            row["output"] if isinstance(row["output"], str) else __import__("json").dumps(row["output"]),
                            row.get("image_path"),
                        )
                    )
        return records


class GrowthZScoreDataset:
    """WHO growth Z-score tracking (target r=0.97)."""

    TASK_NAME = "growth"
    DEFAULT_DATA_DIR = "data/hai-pediatric/growth_zscore"

    def build(self, data_root: Optional[Path] = None) -> List[Dict[str, Any]]:
        root = Path(data_root or self.DEFAULT_DATA_DIR)
        records = [
            _ensure_task_record(
                self.TASK_NAME,
                "### Growth (24mo M)\nWeight 12.2 kg, Length 86 cm, HC 48 cm. WHO standards.",
                '{"weight_z": -0.3, "length_z": 0.1, "hc_z": 0.0, "risk_level": "low", "followup_days": 90}',
            ),
        ]
        for p in root.glob("**/*.jsonl"):
            for row in _load_jsonl_or_empty(p):
                if "instruction" in row and "output" in row:
                    records.append(
                        _ensure_task_record(
                            self.TASK_NAME,
                            row["instruction"],
                            row["output"] if isinstance(row["output"], str) else __import__("json").dumps(row["output"]),
                            row.get("image_path"),
                        )
                    )
        return records


class FractureDataset:
    """Fracture classification (distal radius F1 target 0.94)."""

    TASK_NAME = "fracture"
    DEFAULT_DATA_DIR = "data/hai-pediatric/fractures"

    def build(self, data_root: Optional[Path] = None) -> List[Dict[str, Any]]:
        root = Path(data_root or self.DEFAULT_DATA_DIR)
        records = [
            _ensure_task_record(
                self.TASK_NAME,
                "### Wrist X-ray (PA/lateral)\nAge 8y M. Distal radius. Image quality: good.",
                '{"fracture": true, "type": "distal_radius", "displacement_mm": 2, "ortho_urgency": "routine", "confidence": 0.95}',
                image_path="",
            ),
        ]
        for p in root.glob("**/*.jsonl"):
            for row in _load_jsonl_or_empty(p):
                if "instruction" in row and "output" in row:
                    records.append(
                        _ensure_task_record(
                            self.TASK_NAME,
                            row["instruction"],
                            row["output"] if isinstance(row["output"], str) else __import__("json").dumps(row["output"]),
                            row.get("image_path"),
                        )
                    )
        return records


class CHWWorkflowDataset:
    """CHW 2-tap workflow / PDF generation."""

    TASK_NAME = "chw_workflow"
    DEFAULT_DATA_DIR = "data/hai-pediatric/chw_workflow"

    def build(self, data_root: Optional[Path] = None) -> List[Dict[str, Any]]:
        root = Path(data_root or self.DEFAULT_DATA_DIR)
        records = [
            _ensure_task_record(
                self.TASK_NAME,
                "### CHW Workflow\nPatient: 24mo F. ASQ-3 Communication=18/60. ROP N/A. Need 2-tap screening PDF.",
                "## Screening Summary\n- ASQ-3: Referral (Communication).\n- Actions: SLP eval, Audiology 7d.\n- PDF: [Generate 2-tap workflow].\n",
            ),
        ]
        for p in root.glob("**/*.jsonl"):
            for row in _load_jsonl_or_empty(p):
                if "instruction" in row and "output" in row:
                    records.append(
                        _ensure_task_record(
                            self.TASK_NAME,
                            row["instruction"],
                            row["output"] if isinstance(row["output"], str) else __import__("json").dumps(row["output"]),
                            row.get("image_path"),
                        )
                    )
        return records


class MultilingualReportDataset:
    """Multilingual risk reports (12 languages + RTL)."""

    TASK_NAME = "multilingual"
    DEFAULT_DATA_DIR = "data/hai-pediatric/multilingual"

    def build(self, data_root: Optional[Path] = None) -> List[Dict[str, Any]]:
        root = Path(data_root or self.DEFAULT_DATA_DIR)
        records = [
            _ensure_task_record(
                self.TASK_NAME,
                '{"result": {"risk_level": "referral", "summary": "Communication delay."}, "language": "es"}',
                "Resumen: Posible retraso del habla. Recomendamos evaluación con logopedia en 7 días.",
            ),
        ]
        for p in root.glob("**/*.jsonl"):
            for row in _load_jsonl_or_empty(p):
                if "instruction" in row and "output" in row:
                    records.append(
                        _ensure_task_record(
                            self.TASK_NAME,
                            row["instruction"] if isinstance(row["instruction"], str) else __import__("json").dumps(row["instruction"]),
                            row["output"] if isinstance(row["output"], str) else __import__("json").dumps(row["output"]),
                            row.get("image_path"),
                        )
                    )
        return records


TASK_DATA_SUBDIRS = {
    "asq3": "asq3_scoring",
    "rop": "rop_detection",
    "bone_age": "bone_age",
    "growth": "growth_zscore",
    "fracture": "fractures",
    "chw_workflow": "chw_workflow",
    "multilingual": "multilingual",
}


def get_task_builders() -> Dict[str, Any]:
    """Map task name to builder class for multi-task dataset creation."""
    return {
        "asq3": ASQ3Scorer,
        "rop": ROPDetector,
        "bone_age": BoneAgeAssessor,
        "growth": GrowthZScoreDataset,
        "fracture": FractureDataset,
        "chw_workflow": CHWWorkflowDataset,
        "multilingual": MultilingualReportDataset,
    }
