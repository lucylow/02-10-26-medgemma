# MedGemma-4B QLoRA Fine-Tuning

Implementation-ready QLoRA recipe for MedGemma-4B on pediatric developmental screening.

## Quick Start

```bash
# 1. Install dependencies
pip install -r training/requirements.txt

# 2. Prepare SFT data from synthetic parquet
python training/prepare_sft_data.py --input data/synthetic/v1.0/train.parquet --output data/finetune_sft

# 3. Fine-tune
python training/finetune_lora.py --data data/finetune_sft --output-dir outputs/medgemma-4b-peds-qlora

# 4. Run inference with adapter
python training/inference_qlora.py --adapter outputs/medgemma-4b-peds-qlora-adapter
```

## Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| Base model | `google/medgemma-4b-it` | Instruction-tuned |
| Quantization | 4-bit NF4, bfloat16 compute | Double quant enabled |
| LoRA r | 16 | |
| LoRA alpha | 16 | |
| LoRA dropout | 0.05 | Raise to 0.1 for small datasets |
| Target modules | q/k/v/o_proj, gate/up/down_proj | Use `--attention-only` for VRAM limits |
| Batch size | 2 × 8 grad accum = 16 effective | |
| LR | 1e-4, cosine, warmup 3% | |
| Epochs | 3 | |

## Mounting in PediScreen

Configure `pedi_screen/medgemma_core/model_loader.py` or your inference service to use the adapter path:

```python
config = {
    "BASE_MODEL_ID": "google/medgemma-4b-it",
    "LORA_ADAPTER_PATH": "outputs/medgemma-4b-peds-qlora-adapter",
}
```
