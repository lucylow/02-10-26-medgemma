# PediScreen AI – MedGemma Evaluation

Production clinical validation pipeline using ASQ-3 gold standard and Kaggle-ready metrics.

## Quick start

From **repo root** (recommended):

```bash
# 1. Install dependencies (from repo root or eval/)
npm install
# If running from repo root, install eval deps:
cd eval && npm install && cd ..

# 2. Run evaluation (creates ./data/asq3-gold-standard.json if missing)
npx ts-node eval/medgemma-evaluator.ts

# 3. View results
open eval-results/report.html
```

From **eval/** directory:

```bash
cd eval
npm install
npm run eval
open ../eval-results/report.html   # or eval-results/ if cwd is eval
```

## Config

- **Test set:** `./data/asq3-gold-standard.json` (sample created on first run)
- **Model:** `google/medgemma-2b-it-q4-k-m` (Transformers.js)
- **Outputs:** `./eval-results/predictions.json`, `evaluation-summary.json`, `report.html`

## Metrics

- AUC-ROC, precision, recall, F1, accuracy (referral vs non-referral)
- Cohen’s kappa, ASQ-3 Pearson correlation, ICD-10 precision/recall
- Inference latency (avg and P95)
