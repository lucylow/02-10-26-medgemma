# MedGemma-4B Pediatric Fine-Tuning

QLoRA fine-tuning of `google/medgemma-4b-it` for pediatric developmental screening with CDS-only outputs.

## Quick Start

```bash
# Install dependencies (from repo root)
pip install -r training/requirements.txt

# Accept MedGemma terms at https://huggingface.co/google/medgemma-4b-it
huggingface-cli login

# Run training (example with sample data)
cd model/finetuning
python finetune_medgemma4b_pediatric.py \
  --data-path ../../data/pediatric_screening_sample.json \
  --output-dir ../../outputs/pediscreen-4b-lora
```

## Dataset Schema

Each record in your JSON/JSONL should have:

| Field | Type | Description |
|-------|------|-------------|
| `patient_id` | str | Required for patient-level splits (no leakage) |
| `age_months` | int | Child age in months |
| `observations` | str | Caregiver/text observations |
| `image_path` | str \| null | Optional path to drawing/activity image |
| `risk` | str | `low` \| `monitor` \| `high` \| `refer` |
| `summary` | list[str] | 2–4 bullet points |
| `rationale` | str | Screening-level explanation (no diagnosis) |
| `next_steps` | list[str] | Suggested actions |

## Options

- `--images-dir`: Base directory for relative `image_path` values
- `--no-cds-safety`: Skip adversarial CDS refusal examples
- `--no-4bit`: Disable 4-bit quantization (higher VRAM)
- `--epochs`, `--batch-size`, `--lr`, `--lora-r`, `--lora-alpha`

## Output

- LoRA adapter weights saved to `--output-dir`
- Processor/tokenizer saved alongside
- Use with base model: `model = PeftModel.from_pretrained(base_model, adapter_path)`

## Regulatory

CDS only — not a diagnostic device. All outputs use screening-level language.
