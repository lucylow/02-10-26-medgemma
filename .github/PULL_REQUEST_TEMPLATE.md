## Summary
Short description of changes and training artifacts.

## New artifacts
- Adapter path: outputs/adapters/...
- Model card: MODEL_CARD.md
- Data manifest: data/manifests/xxxx.jsonl

## Tests
- CI: passed? [ ]
- Local reproducibility steps: (commands)

## Evaluation
- Metric summary (sensitivity / specificity / AUC)
- Per-slice worst-case drop

## Human eval
- Number of clinician reviewers: N
- Mean usefulness score: X

## Rollout plan
- Canary %: 5%
- Fallback & circuit-breaker validated: yes/no

---

### Reviewer checklist
- [ ] Repro steps present
- [ ] Adapter saved & adapter_card included
- [ ] Evaluation artifacts attached
- [ ] MODEL_CARD drafted
- [ ] Bias audit done or plan provided
