# Cursor Project Prompt: PediScreen AI – Production Data Pipeline & Privacy Overhaul

**Version:** 1.0  
**Repository:** https://github.com/lucylow/02-10-26-medgemma  
**Target:** Production-grade data pipeline with HIPAA/GDPR-compliant privacy, synthetic data generation, and curated dataset quality

---

## Executive Summary

You are an expert ML engineer and data privacy specialist refactoring the `lucylow/02-10-26-medgemma` repository to implement a production-grade data pipeline for **PediScreen AI**, a pediatric developmental screening CDS tool using MedGemma + MedSigLIP. Real patient data is sensitive and scarce, so we prioritize **synthetic data for training** while enabling **secure real data pipelines** for production validation.

**Core Goals:**
1. **Synthetic data generation** – High-fidelity, diverse synthetic screening cases for LoRA fine-tuning
2. **Data privacy pipeline** – Anonymization, encryption, differential privacy at every stage
3. **Curated data quality** – Validation, deduping, milestone grounding, clinical review
4. **Production readiness** – Data lineage, versioning, audit trails, compliance

---

## Part 1: Project Structure (Create This Exactly)

### 1.1 Directory Layout

```
data/
├── synthetic/                    # Generated training data
│   ├── generation/              # Scripts, prompts, configs
│   │   ├── prompts/
│   │   │   ├── caregiver_observation.txt
│   │   │   ├── clinician_label.txt
│   │   │   └── milestone_context.json
│   │   └── config.yaml
│   ├── validation/              # Quality checks, clinician review
│   │   ├── review_queue.jsonl
│   │   └── rejected_samples.jsonl
│   └── versions/                # v1.0, v1.1 (Parquet + JSONL)
│       ├── v1.0/
│       │   ├── train.parquet
│       │   ├── validation.parquet
│       │   └── manifest.json
│       └── v1.1/
├── real/                         # Anonymized production data (encrypted)
│   ├── raw/                     # Encrypted ingestion
│   ├── processed/               # Anonymized, validated
│   └── audit/                   # Lineage, consent, de-ident logs
├── public/                       # M-CHAT, CDC milestones (existing)
├── schemas/                      # Pydantic/Zod models (shared)
├── pipelines/                    # Dagster workflows (existing)
├── privacy/                      # Anonymization tools
│   ├── k_anonymity.py
│   └── dp_noise.py
└── quality/                      # Great Expectations, custom validators
    ├── expectations/
    └── validators.py
```

### 1.2 Python Data Library Structure

```
src/data/
├── __init__.py
├── schemas.py                    # Single source of truth (Pydantic)
├── generator.py                  # Synthetic data engine (LLM-driven)
├── anonymizer.py                # k-anonymity, DP noise
├── validator.py                 # Quality gates (expand existing)
├── loader.py                    # HF datasets, Parquet
├── lineage.py                   # Provenance tracking
└── training_formatter.py        # MedGemma chat template (existing)
```

### 1.3 Implementation Commands

```bash
# Create structure
mkdir -p data/synthetic/{generation/prompts,validation,versions/v1.0}
mkdir -p data/real/{raw,processed,audit}
mkdir -p data/{privacy,quality/expectations,schemas,pipelines}
mkdir -p src/data
```

---

## Part 2: Data Models (Single Source of Truth)

### 2.1 Canonical Schemas – `src/data/schemas.py`

**CRITICAL:** All screening records (synthetic and real) must conform to these Pydantic models. The backend `ScreeningPayload`/`ScreeningResult` and frontend TypeScript types should derive from or align with these schemas.

```python
# src/data/schemas.py
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Dict, Optional, Literal
from datetime import datetime
from enum import Enum


class DevelopmentalDomain(str, Enum):
    COMMUNICATION = "communication"
    GROSS_MOTOR = "gross_motor"
    FINE_MOTOR = "fine_motor"
    SOCIAL = "social"
    COGNITIVE = "cognitive"


class RiskLevel(str, Enum):
    ON_TRACK = "on_track"
    MONITOR = "monitor"
    DISCUSS = "discuss"
    REFER = "refer"


class DevelopmentalMilestone(BaseModel):
    """Single milestone from CDC/ASQ guidelines."""
    age_months: int = Field(..., ge=0, le=72)
    domain: DevelopmentalDomain
    description: str = Field(..., min_length=3)
    expected_percentile: float = Field(..., ge=0, le=1)


class ScreeningObservation(BaseModel):
    """Caregiver observation with optional visual evidence."""
    text: str = Field(..., min_length=10)
    image_embedding: Optional[List[float]] = None  # MedSigLIP 768-dim
    visual_features: Optional[Dict[str, float]] = None  # e.g. "pincer_grip": 0.72
    structured_scores: Dict[str, float] = Field(default_factory=dict)

    @field_validator("image_embedding")
    @classmethod
    def validate_embedding_shape(cls, v):
        if v is not None and len(v) not in (256, 768):
            raise ValueError("Embedding must be 256 or 768 dims (MedSigLIP)")
        return v

    @field_validator("structured_scores")
    @classmethod
    def validate_scores_range(cls, v):
        for k, val in v.items():
            if not 0 <= val <= 1:
                raise ValueError(f"Score {k}={val} must be 0-1")
        return v


class ClinicianLabel(BaseModel):
    """Expert annotation for screening record."""
    risk_level: RiskLevel
    rationale: str = Field(..., min_length=10)
    recommendations: List[str] = Field(default_factory=list)
    confidence: float = Field(..., ge=0, le=1)


class ScreeningRecord(BaseModel):
    """Canonical screening record – synthetic or real."""
    record_id: str = Field(..., min_length=1)
    synthetic: bool = False
    demographics: Dict[str, str] = Field(default_factory=dict)  # age_group, language (anonymized)
    observations: List[ScreeningObservation] = Field(default_factory=list)
    milestones_context: List[DevelopmentalMilestone] = Field(default_factory=list)
    clinician_label: ClinicianLabel
    created_at: datetime = Field(default_factory=datetime.utcnow)
    provenance: Dict[str, str] = Field(default_factory=dict)

    @field_validator("demographics")
    @classmethod
    def no_phi_in_demographics(cls, v):
        forbidden = {"zipcode", "ethnicity", "name", "dob", "address", "ssn"}
        if any(k.lower() in forbidden for k in v):
            raise ValueError("Demographics must not contain PHI")
        return v
```

### 2.2 Backward Compatibility with Existing Code

The current `SyntheticScreening` in `src/data/synthetic_generator.py` uses `age_months`, `domain`, `caregiver_text`, `structured_scores`, `visual_features`, `clinician_risk`. Map to `ScreeningRecord`:

- `caregiver_text` → `observations[0].text`
- `clinician_risk` → `clinician_label.risk_level`
- Add `milestones_context` from CDC lookup
- Add `provenance` with `generator_version`, `synthetic: true`

### 2.3 Frontend TypeScript Alignment

Ensure `app/frontend/src` types align:

```typescript
// Types should map: risk_level ↔ riskLevel, clinician_label ↔ clinicianLabel
export type RiskLevel = 'on_track' | 'monitor' | 'discuss' | 'refer';
export type DevelopmentalDomain = 'communication' | 'gross_motor' | 'fine_motor' | 'social' | 'cognitive';
```

---

## Part 3: Synthetic Data Generation Engine

### 3.1 Architecture Overview

**Primary generator:** LLM-driven (Gemma 3, Llama 3.1, or HF inference) with structured prompts + post-processing. The current `SyntheticDataGenerator` uses rule-based caregiver text; **upgrade to LLM generation** for higher fidelity.

### 3.2 Generator Class – `src/data/generator.py`

```python
# src/data/generator.py
import asyncio
import random
from pathlib import Path
from typing import Dict, List, Optional

from .schemas import ScreeningRecord, ScreeningObservation, ClinicianLabel, DevelopmentalMilestone, RiskLevel


class SyntheticDataGenerator:
    def __init__(self, llm_client, milestone_db_path: Path):
        self.llm = llm_client
        self.milestones = self._load_milestones(milestone_db_path)

    async def generate_record(self, params: Optional[Dict] = None) -> ScreeningRecord:
        params = params or {}
        age = params.get("age") or random.choice([18, 24, 36, 48, 60])
        domain = params.get("domain") or random.choice(list(DevelopmentalDomain))

        # 1. LLM: caregiver observation
        prompt = self._build_caregiver_prompt(age, domain.value)
        observation_text = await self.llm.generate(prompt)

        # 2. Visual features (mock MedSigLIP)
        visual_features = self._generate_visual_features(age, domain.value)

        # 3. Structured scores (correlated with text)
        scores = self._generate_correlated_scores(observation_text, age)

        # 4. Clinician label (LLM or rule-based)
        label_prompt = self._build_label_prompt(observation_text, scores)
        clinician_label = await self.llm.generate_structured(label_prompt)

        # 5. Milestone context (2-3 age-appropriate)
        milestones = self._sample_milestones(age, domain.value, n=3)

        return ScreeningRecord(
            record_id=f"synth_{hash(observation_text) % 10**8:08d}",
            synthetic=True,
            demographics={"age_group": f"{age}m", "language": "en"},
            observations=[ScreeningObservation(
                text=observation_text,
                visual_features=visual_features,
                structured_scores=scores,
            )],
            milestones_context=milestones,
            clinician_label=clinician_label,
            provenance={
                "generator_version": "v2.1",
                "llm_model": "gemma-2-9b",
                "milestone_db": str(milestone_db_path),
            },
        )
```

### 3.3 Prompt Engineering

**Caregiver observation prompt** (`data/synthetic/generation/prompts/caregiver_observation.txt`):

```
You are generating realistic parent/caregiver descriptions for a {age}-month-old child in the {domain} domain.

Examples:
- Age 24m, communication: "He says about 15 words but doesn't put 2 together yet."
- Age 36m, fine motor: "She can stack 4 blocks but scribbles with whole fist."

Generate 1 paragraph of natural caregiver text. Vary vocabulary and concern level.
Do NOT use medical jargon. Use first-person or third-person parent voice.
```

**Clinician label prompt** (`data/synthetic/generation/prompts/clinician_label.txt`):

```
You are a pediatric developmental specialist labeling screening cases.

Given caregiver text: {text}
Structured scores: {scores}

Output JSON only:
{"risk_level": "monitor", "rationale": "...", "recommendations": ["..."], "confidence": 0.8}

Ground in CDC/ASQ milestones. Be conservative. Use only: on_track, monitor, discuss, refer.
```

### 3.4 Visual Features Mock

```python
def _generate_visual_features(self, age: int, domain: str) -> Dict[str, float]:
    if domain == "fine_motor":
        return {
            "pincer_grip": float(np.random.beta(0.5 + age / 60, 2)),
            "line_stroke_control": float(np.random.beta(0.3, 1.5)),
            "spatial_org": float(np.random.beta(0.4, 1.2)),
        }
    elif domain == "communication":
        return {
            "verbal_fluency": float(np.random.beta(0.4 + age / 72, 1.5)),
            "gesture_use": float(np.random.beta(0.5, 1.2)),
        }
    # ... other domains
    return {"feat_0": float(np.random.uniform(0, 1))}
```

### 3.5 LLM Client Abstraction

Support LiteLLM or HuggingFace inference:

```python
# Use litellm for multi-provider support
# pip install litellm
import litellm

async def generate(prompt: str) -> str:
    return await litellm.acompletion(
        model="gemma/gemma-2-9b-it",
        messages=[{"role": "user", "content": prompt}],
    )
```

---

## Part 4: Data Quality Pipeline

### 4.1 Validation Gates – `src/data/validator.py`

Expand the existing `PediatricDataValidator` with:

1. **Realism checks:** Perplexity proxy, score-text alignment, milestone coverage
2. **Diversity checks:** Demographic balance, domain balance, risk balance
3. **Clinical alignment:** No diagnosis language (reuse `safety_agent.check_safety`)

```python
# src/data/validator.py
class ScreeningValidator:
    def check_realism(self, record: ScreeningRecord) -> List[str]:
        issues = []
        text = record.observations[0].text if record.observations else ""
        if self._perplexity(text) > 20:
            issues.append("Unnatural text (high perplexity)")
        if self._score_text_alignment(record) < 0.7:
            issues.append("Score-text misalignment")
        if self._milestone_coverage(record) < 0.5:
            issues.append("Insufficient milestone grounding")
        return issues

    def check_diversity(self, batch: List[ScreeningRecord]) -> List[str]:
        issues = []
        risk_counts = Counter(r.clinician_label.risk_level for r in batch)
        if max(risk_counts.values()) > 0.45 * len(batch):
            issues.append("Risk distribution imbalance")
        return issues
```

### 4.2 Great Expectations Integration

```python
# data/quality/expectations/screening_expectations.py
import great_expectations as gx

expectations = [
    {"expect_column_values_to_not_be_null": {"column": "record_id"}},
    {"expect_column_values_to_be_in_set": {"column": "clinician_risk", "value_set": ["on_track", "monitor", "discuss", "refer"]}},
    {"expect_column_values_to_match_regex": {"column": "caregiver_text", "regex": r".{20,}"}},
]
```

### 4.3 Clinician Review Loop

```python
# Semi-automated: filter low-confidence, queue for review
review_candidates = [r for r in batch if r.clinician_label.confidence < 0.7]
for record in review_candidates:
    # Export to review_queue.jsonl for UI
    # On approval: add to dataset; on reject: regenerate
    pass
```

---

## Part 5: Privacy & Anonymization Pipeline

### 5.1 k-Anonymity – `src/data/anonymizer.py`

```python
# src/data/anonymizer.py
class PrivacyProcessor:
    def anonymize_demographics(self, record: ScreeningRecord) -> None:
        # Quasi-identifiers → bands
        if "age_months" in record.demographics:
            age = int(record.demographics["age_months"])
            band = f"{(age // 6) * 6}-{(age // 6 + 1) * 6}"
            record.demographics["age_band"] = band
            del record.demographics["age_months"]
        # Remove PHI
        for k in list(record.demographics):
            if k.lower() in {"zipcode", "ethnicity", "name", "dob"}:
                del record.demographics[k]

    def add_dp_noise(self, scores: Dict[str, float], epsilon: float = 1.0) -> Dict[str, float]:
        for key in scores:
            noise = np.random.laplace(0, 1 / epsilon)
            scores[key] = float(np.clip(scores[key] + noise, 0, 1))
        return scores
```

### 5.2 Encryption at Rest

- **Raw data:** AES-256 with per-record keys
- **Embeddings:** Encrypt before storage (PHI-adjacent)
- **Metadata:** Consent status, lineage hashes in cleartext for audit

```python
from cryptography.fernet import Fernet

class EncryptedStore:
    def __init__(self, key: bytes):
        self.cipher = Fernet(key)

    def store(self, data: ScreeningRecord) -> str:
        json_data = data.model_dump_json()
        encrypted = self.cipher.encrypt(json_data.encode())
        return encrypted.hex()
```

---

## Part 6: Data Ingestion Workflows

### 6.1 Synthetic Pipeline (Dagster)

Extend `pipelines/data_pipeline.py`:

```yaml
# pipelines/synthetic_pipeline.yaml (conceptual)
jobs:
  generate_synthetic:
    steps:
      - sample_params: 10k records
      - llm_generate: parallel batches
      - validate_batch: quality gates
      - clinician_review_sample: 10% subset
      - anonymize: DP noise
      - save_parquet: data/synthetic/versions/v1.2/
      - lineage: record hashes, generator version
```

### 6.2 Real Data Pipeline

```
Real Screening (encrypted)
  → consent check
  → anonymization (k-anon + DP)
  → validation + deduping
  → append to production dataset (versioned)
  → trigger model retraining if drift detected
```

### 6.3 Drift Detection

- Embedding drift: KS test on new vs old embeddings
- Label shift: risk distribution changes

---

## Part 7: Dataset Curation Process

### 7.1 Sources

| Source | % | Description |
|--------|---|-------------|
| Synthetic | 80% | LLM-generated, CDC-grounded, clinician-reviewed |
| Public | 10% | De-identified ASQ/M-CHAT samples |
| Production | 10%→ | Opt-in consented, anonymized |

### 7.2 Milestone Grounding

Every synthetic record must reference 2–3 age-appropriate milestones from `data/public/cdc_milestones.parquet`.

```python
milestones_db = {
    24: {
        "communication": ["Says 50+ words", "2-word phrases", "Follows 2-step directions"],
        # ...
    },
}
```

---

## Part 8: Integration with Training Pipeline

### 8.1 LoRA Data Loader – `training/data.py`

```python
# training/data.py
def load_training_dataset(version: str = "v1.0") -> datasets.Dataset:
    path = f"data/synthetic/versions/{version}/train.parquet"
    ds = datasets.load_dataset("parquet", data_files=path)

    def preprocess(record):
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": format_observations(record)},
            {"role": "assistant", "content": record["clinician_label"]}
        ]
        return {"messages": messages}

    return ds.map(preprocess)
```

### 8.2 Training-Time Privacy

- **DP-SGD:** Add noise during LoRA training (Opacus)
- **Federated learning ready:** Structure supports per-site adapters

---

## Part 9: Production Data Ops

### 9.1 Data Versioning (DVC)

```bash
dvc add data/synthetic/versions/v1.0/
dvc push
git add data/dvc.yaml data/synthetic/versions/v1.0.dvc
git commit -m "Add synthetic v1.0"
```

### 9.2 Lineage Tracking – `src/data/lineage.py`

```python
record.provenance = {
    "generator_version": "v2.1",
    "llm_model": "gemma-2-9b",
    "anonymization_hash": sha256(inputs).hexdigest()[:16],
    "clinician_reviewed": True,
    "dp_epsilon": 1.0,
}
```

### 9.3 Compliance Audit

- Consent compliance rate
- k-anonymity scores
- Data retention (auto-delete after X months)

---

## Part 10: Frontend Data UX

### 10.1 Data Provenance UI

Clinician view:

```
Screening Data Sources:
✅ Synthetic (CDC-grounded, clinician-reviewed)
🔒 Anonymized production (DP-noised)
📊 87% alignment with validation set
```

### 10.2 Consent Management

Parent flow:

```
□ Use for screening (required)
□ De-identified research (optional)
□ Delete images after processing (recommended)
```

Implement in `app/frontend/src/components/pediscreen/ConsentModal.tsx` and `ImageUploadConsentModal.tsx`.

---

## Part 11: Implementation Checklist

### Phase 1: Structure & Schemas (Week 1)
- [ ] Create `data/` and `src/data/` directory structure
- [ ] Implement `src/data/schemas.py` with full validators
- [ ] Align `backend/app/schemas/screening.py` with canonical schemas
- [ ] Add Zod/TypeScript types in frontend

### Phase 2: Synthetic Generator (Week 2)
- [ ] Add LLM client (LiteLLM or HF) to `src/data/generator.py`
- [ ] Create prompt templates in `data/synthetic/generation/prompts/`
- [ ] Implement `generate_record()` with milestone grounding
- [ ] Add `generate_batch()` with async parallelization

### Phase 3: Quality & Privacy (Week 3)
- [ ] Expand `src/data/validator.py` with realism/diversity checks
- [ ] Implement `src/data/anonymizer.py` (k-anon, DP)
- [ ] Add Great Expectations suite
- [ ] Implement `EncryptedStore` for real data

### Phase 4: Pipelines & Integration (Week 4)
- [ ] Extend Dagster pipeline with validation + lineage steps
- [ ] Add `training/data.py` loader
- [ ] DVC setup for data versioning
- [ ] Clinician review queue (JSONL + UI)

### Phase 5: Frontend & Compliance (Week 5)
- [ ] Data provenance UI component
- [ ] Consent management enhancements
- [ ] Audit report generation
- [ ] Documentation and runbooks

---

## Part 12: Success Metrics

### Data Quality
- Perplexity < 15 on held-out real samples
- 90%+ clinician agreement on risk labels
- Embedding coverage: 95% valid MedSigLIP dims

### Privacy
- k-anonymity ≥ 5 across quasi-identifiers
- DP-ε ≤ 1.0 per record
- 100% consent audit trail

### Training Impact
- Synthetic LoRA vs real LoRA: <5% F1 gap
- Generalization to new demographics

---

## Part 13: Cursor-Specific Instructions

When implementing changes in this repository:

1. **Preserve existing behavior** where it aligns with this spec; refactor incrementally.
2. **Use the canonical schemas** (`ScreeningRecord`, etc.) as the single source of truth.
3. **Respect the safety agent** – no diagnosis language in generated or stored data.
4. **Prefer async** for LLM and I/O operations.
5. **Add tests** for new validators, anonymizers, and generators.
6. **Document** environment variables (e.g., `LLM_API_KEY`, `ENCRYPTION_KEY`) in `.env.example`.
7. **Run `make lint`** before committing backend changes.

---

## Part 14: File-by-File Refactoring Map

| Current File | Action |
|--------------|--------|
| `src/data/synthetic_generator.py` | Migrate to `generator.py`, add LLM, use `ScreeningRecord` |
| `src/data/validator.py` | Expand with realism/diversity, integrate safety_agent |
| `data/download_public.py` | Keep; ensure CDC milestones feed generator |
| `pipelines/data_pipeline.py` | Add validation, lineage, clinician review steps |
| `training/finetune_lora.py` | Use `training/data.py` loader, support new schema |
| `backend/app/schemas/screening.py` | Add `from src.data.schemas import ...` or align fields |
| `app/frontend/src/contexts/ScreeningContext.tsx` | Add provenance, consent flags |

---

## Part 15: Dependencies to Add

```txt
# requirements-data.txt (extend)
litellm>=1.0.0
great-expectations>=0.18.0
cryptography>=42.0.0
opacus>=1.4.0  # DP-SGD for training
dagster>=1.6.0
dvc>=3.0.0
```

---

## Appendix A: Environment Variables

```bash
# .env.example additions
LLM_API_KEY=              # For LiteLLM/HF inference
LLM_MODEL=gemma-2-9b-it
ENCRYPTION_KEY=           # Fernet key for real data
DP_EPSILON=1.0
DAGSTER_HOME=./.dagster
```

---

## Appendix B: Quick Reference – Risk Level Mapping

| Legacy (medgemma_service) | Canonical (ScreeningRecord) |
|---------------------------|-----------------------------|
| low | on_track |
| medium | monitor |
| high | discuss |
| refer | refer |

---

*End of Cursor Project Prompt. Use this document as the authoritative specification when refactoring the PediScreen AI data pipeline.*
