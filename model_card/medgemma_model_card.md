# MedGemma Model Card — PediScreen AI

## Base Model Provenance

- **Model**: `google/medgemma-2b-it`
- **Date**: As of Hugging Face / Google release
- **License**: Check model repository for current terms
- **Training scope**: Biomedical corpora, general medical reasoning

## Adapter Provenance

- **Adapter**: `gs://bucket/pediscreen/adapters/pediscreen_v1` (or local `./adapters/pediscreen_lora`)
- **Training data**: Deidentified developmental screening dataset
- **Augmentation**: Standard augmentation as per finetuning scripts
- **Evaluation**: Sensitivity/specificity per slice; see evaluation reports

## Limitations

- **CDS only**: Clinical decision support; not a diagnostic device.
- **Human-in-the-loop**: All outputs require clinician review and sign-off.
- **Risks**: False negatives (missing delay); bias across demographics.
- **Mitigations**: Conservative baselines, explainability, audit trails.
