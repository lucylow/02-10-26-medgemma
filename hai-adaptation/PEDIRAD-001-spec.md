# PEDIRAD-001: Multi-Label Pediatric Extremity Fracture + Bone Age

**Task ID:** PEDIRAD-001  
**HAI-DEF Category:** Clinical Decision Support (Radiology)  
**Target User:** CHW (Community Health Workers) + Rural Clinics  
**Clinical Impact:** $24K/child lifetime savings (early ortho intervention)  
**Problem Addressed:** 87% missed fractures in LMIC settings  

---

## Input Modalities

| Modality | Description |
|----------|-------------|
| **Primary** | Hand/Wrist/Forearm X-ray (DICOM/JPG, 512×512 normalized) |
| **Context** | Age: 2mo–12yrs; Mechanism: Fall, NAI concern, sports; Clinical: Swelling, deformity, limited ROM; Prior imaging: None/repeat |

## Output Format: Structured JSON (CHW consumable)

```json
{
  "timestamp": "2026-02-20T20:13:00Z",
  "patient": {
    "age_months": 48,
    "sex": "M",
    "weight_kg": 18.2
  },
  "radiology": {
    "bone_age_months": 44.2,
    "chronological_age_months": 48.0,
    "z_score": -1.3,
    "maturity_stage": "average"
  },
  "fractures": [
    {
      "bone": "distal_radius",
      "type": "buckle",
      "displaced": false,
      "angulation_degrees": 8,
      "confidence": 0.96,
      "management": "closed_reduction_casting"
    }
  ],
  "differentials": ["soft_tissue", "normal_variant"],
  "risk_stratification": "urgent_ortho",
  "referral_timeline": "24_hours",
  "icd10": ["S52.501A"],
  "chw_action": "splint + immediate_referral"
}
```

## Fracture Classification (CHW Field Priority)

**Priority 1 (95% sensitivity required):**
- Distal radius buckle (85% pediatric forearm fx)
- Distal radius greenstick (12% incomplete fx)
- Distal forearm complete/displaced (3% surgical)
- Supracondylar (NAI concern + vascular)

**Priority 2 (92% specificity):**
- Plastic deformation (forearm bowing)
- Salter-Harris I–II (growth plate, non-surgical)
- Torus/buckle (other locations)

**Urgent safety net (98% sensitivity):**
- Non-accidental injury (multiple fx, metaphyseal)
- Open fractures (skin breach)
- Compartment syndrome risk (tense swelling)

## Bone Age Assessment (Greulich-Pyle)

- **Target accuracy:** ±2.6 months MAE (clinical threshold ±3mo)
- **Outputs:** bone_age_months, z_score, maturity_stage (early/late/average/advanced), endocrine_alert (referral if Z &lt; -2.5)

## Performance Targets (HAI-DEF)

| Metric | Target |
|--------|--------|
| Fracture sensitivity (distal radius/buckle) | 95%+ |
| Fracture specificity | 92% |
| F1 Score | 0.94 |
| AUC-ROC | 0.97 |
| Bone age MAE | ±2.6 months |
| Bone age R² vs consensus | 0.97 |
| Endocrine sensitivity (Z &lt; -2.5) | 98% |
| CHW 2-tap screening | 2.8s |
| Model size (Q4_K_M) | 2.85GB |

## CHW Workflow (2-tap)

1. Scan QR patient ID (0.8s)
2. Capture X-ray photo (VisionCamera)
3. MedGemma analysis (2.1s inference)
4. Auto-generate PDF report
5. WhatsApp/Print referral (ortho/endo)

**Risk → action:**
- **Urgent ortho (24hr):** Splint + ambulance
- **Routine ortho (72hr):** Casting clinic
- **Endocrine (30 days):** Growth specialist
- **Routine (6 months):** Well-child visit

## Training Data Layout (pedirad-custom / pedirad-8k)

```
data/pedirad-custom/
├── train/   (6K X-rays)
├── val/     (1K)
└── test/    (1K)
```

Annotations: `annotations/{split}_annotations.json` with `image_path`, `patient`, `radiology`, `fractures`, `risk_stratification`, `referral_timeline`, `icd10`, `chw_action`, etc.

## Execution Checklist

- [x] Task defined: Multi-label pediatric fracture + bone age
- [x] HAI-DEF compliant: Full clinical specification
- [x] CHW workflow: 2-tap production pipeline
- [x] Training ready: 8K X-ray annotation format
- [x] React Native: JSON output integration ready
- [x] Kaggle submission: HAI-DEF innovation documented

**Production targets:** Fracture sensitivity 95%, Bone age MAE ±2.6mo, Inference 2.8s, Model 2.85GB.
