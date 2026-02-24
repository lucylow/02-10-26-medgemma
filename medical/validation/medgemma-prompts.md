## MedGemma Prompting for Pediatric Developmental Screening

This document captures the **canonical prompt patterns** used when calling MedGemma (and related HAI-DEF agents) for PediScreen AI.

For the full technical description, see `docs/model_architecture.md` and `backend/app/services/medgemma_service.py`. This file is intended as an audit- and clinician-friendly summary.

### 1. Core Screening Prompt

**Goal:** Generate a structured developmental screening summary, calibrated risk estimate, and caregiver-facing explanation from:

- Age in months
- Text observations from CHW/clinician
- Optional embedding metadata from on-device visual analysis

Prompts emphasize:

- Clear separation between **clinical summary**, **risk**, and **recommendations**
- Explicit requirement to avoid diagnostic language (support only)
- JSON output with fields: `summary`, `risk`, `recommendations`, `parent_text`, `explain`, `reasoning_chain`, `evidence`, `confidence`

### 2. Safety and PHI Language

Prompts:

- Instruct the model to **avoid storing or repeating directly identifying details**.
- Reinforce that the output is **for clinician review**, not direct family-facing diagnosis.
- Encourage conservative recommendations when confidence is low, e.g. suggesting further observation or referral rather than strong reassurance.

### 3. Validation & Versioning

- Each prompt template is versioned (e.g. `prompt_version: v1.2.0`) and logged in the inference audit trail.
- Changes to prompts should be accompanied by:
  - An updated section here summarizing the change.
  - Validation runs comparing calibration and clinical acceptability before and after the change.

This file can be extended with concrete prompt examples and redacted transcripts as part of clinical validation or regulatory review.

