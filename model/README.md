---
language:
- en
license: apache-2.0
base_model: google/medgemma-2b-it
tags:
- medical
- vision-language
- pediatrics
- developmental-screening
- medgemma
- lora
- hai-def
---

# PediScreen-2B: A Developmental Screening Assistant

## Model Description
**PediScreen-2B** is a lightweight multimodal AI assistant fine-tuned from **`google/medgemma-2b-it`** (a HAI-DEF model) to help community health workers and parents conduct preliminary developmental screenings for children aged 0-5.

**Parent Model:** [google/medgemma-2b-it](https://huggingface.co/google/medgemma-2b-it) (Part of Google's HAI-DEF suite)

## Model Tracing (MedGemma Impact Challenge)

This model implements both **Provenance Tracing** and **Weight Tracing** to ensure technical integrity and reproducibility.

### 1. Provenance Trace (Pedigree)
- **Base Model ID:** `google/medgemma-2b-it`
- **Lineage:** This model is a direct descendant of the MedGemma 2B foundation model.
- **Modification:** Applied Parameter-Efficient Fine-Tuning (LoRA) to adapt the model for pediatric developmental milestone reasoning.
- **Training Data:** A synthetic dataset of ~5,000 developmental scenarios generated from CDC milestone guidelines and ASQ-3 questionnaires.

### 2. Weight Trace (Architecture & Recipe)
- **Architecture:** MedGemma (Gemma-2-2b-it with Vision-Language components).
- **PEFT Method:** LoRA (Low-Rank Adaptation).
- **Targeted Modules:** `q_proj`, `v_proj`, `k_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj`.
- **Rank (r):** 8
- **Alpha:** 32
- **Training Script:** [View our fine-tuning script in the repository](./model/finetuning/finetune_pediscreen.py).

## Training Procedure
We used **Parameter-Efficient Fine-Tuning (LoRA)** on the base MedGemma model. The fine-tuning focused on teaching the model risk stratification and recommendation generation based on developmental signals (textual observations and visual indicators).

**Framework:** The model was fine-tuned using the `peft`, `transformers`, and `accelerate` libraries.

## Key Artifacts in this Repository
- `adapter_config.json`: Technical configuration for the LoRA adapters.
- `adapter_model.bin`: Saved adapter weights.
- `README.md`: This model card documenting the trace.

## Intended Use & Limitations
*This is a research prototype for the MedGemma Impact Challenge. It is a decision-support tool, not a medical device.*
- **Intended Use:** Assisting in identifying developmental delays through structured observation.
- **Limitations:** Performance is limited by the underlying foundation model and the specificity of the fine-tuning data. Not for diagnostic use.

## License
This model and its adapters are released under the **Apache 2.0 license**, consistent with the base MedGemma model.
