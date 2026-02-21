"""
PEDIRAD-001 task configuration for MedGemma HAI-DEF adaptation.

Single source of truth: prompt template, output schema, fracture types,
risk stratification, and HAI task metadata. Used by radiology_processor,
task_datasets, pedirad_loader, and inference/CHW workflow.

Task: Multi-label pediatric extremity fracture detection + bone age (Greulich-Pyle).
Target: CHW field deployment, 95% sensitivity distal radius/buckle, ±2.6mo bone age MAE.
"""

from __future__ import annotations

from typing import Any, Dict

# ---------------------------------------------------------------------------
# HAI-DEF task metadata (Kaggle / deployment)
# ---------------------------------------------------------------------------

HAI_PEDIRAD_TASK = {
    "task_id": "PEDIRAD-001",
    "input_modalities": ["xray_image", "clinical_context"],
    "output_format": "structured_json",
    "clinical_roi": "$24K/child",
    "sensitivity_target": 0.95,
    "specificity_target": 0.92,
    "bone_age_mae_target_months": 2.6,
    "training_data_required": 8000,
    "inference_time_target": "2.8s",
    "model_size_target": "2.85GB",
}

# ---------------------------------------------------------------------------
# Fracture types (CHW field priority)
# ---------------------------------------------------------------------------

FRACTURE_TYPES = ("buckle", "greenstick", "complete", "plastic", "salter_harris_i", "salter_harris_ii")
PRIORITY_BONES = ("distal_radius", "distal_ulna", "supracondylar", "metaphyseal")
MANAGEMENT_OPTIONS = ("closed_reduction_casting", "surgical", "splint_only", "observation")

# ---------------------------------------------------------------------------
# Risk stratification and referral (CHW consumable)
# ---------------------------------------------------------------------------

RISK_LEVELS = ("urgent_ortho", "routine_ortho", "endocrine", "routine")
REFERRAL_TIMELINES = ("24_hours", "72_hours", "30_days", "6_months")
MATURITY_STAGES = ("early", "late", "average", "advanced")

# ---------------------------------------------------------------------------
# Prompt template (MedGemma adaptation)
# ---------------------------------------------------------------------------

PROMPT_TEMPLATE = """### Pediatric Radiology Assistant (MedGemma-4B-IT)

HAND/WRIST X-RAY STUDY (PA view, 512x512 normalized)
📋 CLINICAL CONTEXT:
Age: {age_months} months | Sex: {sex} | Weight: {weight_kg}kg
Mechanism: {mechanism} | Symptoms: {symptoms}

📊 PRIOR STUDIES: {prior_imaging}
🔍 IMAGE QUALITY: {quality_score} (0.92 excellent)

REQUIRED ANALYSIS:
1. Bone age assessment (Greulich-Pyle standard)
2. Fracture detection (95% sensitivity distal radius/buckle)
3. Management recommendations (CHW field deployment)
4. Referral timeline (24hr/72hr/routine)

JSON OUTPUT ONLY:
{{
  "bone_age_months": 24.7,
  "fractures": [{{"bone": "distal_radius", "type": "buckle"}}],
  "risk_stratification": "urgent_ortho",
  "chw_action": "splint + immediate_referral"
}}"""


def build_pedirad_prompt(
    age_months: int | float = 48,
    sex: str = "M",
    weight_kg: float = 18.2,
    mechanism: str = "Fall",
    symptoms: str = "Swelling, deformity, limited ROM",
    prior_imaging: str = "None",
    quality_score: float = 0.92,
) -> str:
    """Build PEDIRAD-001 instruction from clinical context."""
    return PROMPT_TEMPLATE.format(
        age_months=int(age_months),
        sex=sex,
        weight_kg=weight_kg,
        mechanism=mechanism or "Fall",
        symptoms=symptoms or "Swelling, deformity, limited ROM",
        prior_imaging=prior_imaging or "None",
        quality_score=quality_score,
    )


# ---------------------------------------------------------------------------
# Production JSON schema (CHW consumable) — for validation / docs
# ---------------------------------------------------------------------------

def production_output_example() -> Dict[str, Any]:
    """Example production JSON for PEDIRAD-001 (CHW consumable)."""
    return {
        "timestamp": "2026-02-20T20:13:00Z",
        "patient": {
            "age_months": 48,
            "sex": "M",
            "weight_kg": 18.2,
        },
        "radiology": {
            "bone_age_months": 44.2,
            "chronological_age_months": 48.0,
            "z_score": -1.3,
            "maturity_stage": "average",
        },
        "fractures": [
            {
                "bone": "distal_radius",
                "type": "buckle",
                "displaced": False,
                "angulation_degrees": 8,
                "confidence": 0.96,
                "management": "closed_reduction_casting",
            }
        ],
        "differentials": ["soft_tissue", "normal_variant"],
        "risk_stratification": "urgent_ortho",
        "referral_timeline": "24_hours",
        "icd10": ["S52.501A"],
        "chw_action": "splint + immediate_referral",
    }
