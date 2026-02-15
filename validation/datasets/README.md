# Gold-Standard Validation Datasets

## gold_holdout.parquet

Clinician-labeled holdout set for validation. Target: 500+ cases at production scale.

**Phase 1 distribution (100 cases):**
- ~20 On Track
- ~40 Monitor
- ~30 Discuss
- ~10 Refer (high-risk)

**Production target (500+ cases):**
- 100 On Track
- 200 Monitor
- 150 Discuss
- 50 Refer

**Labeling requirements:**
- 3+ board-certified pediatricians
- Kappa agreement ≥ 0.75 (substantial agreement)

## external_validation/

Multi-site validation data. No temporal leakage; test strictly after training cutoff.

## adversarial/

Edge cases, safety traps, near-misses for robustness testing.
