#!/usr/bin/env bash
# Example job scheduler script for LoRA finetune (model-dev).
# Purpose: Run finetune_lora.py with config and provenance in a batch env.
# Usage: ./model-dev/training/scheduler.sh [CONFIG_YAML] [PROVENANCE_ID]
# TODO: Set DATA_PATH, OUTPUT_DIR, and optional HF_TOKEN for push.

set -e
CONFIG="${1:-model-dev/training/finetune_config.yaml}"
PROVENANCE_ID="${2:-dev-smoke}"
DATA_PATH="${DATA_PATH:-data/synth_train.jsonl}"
OUTPUT_DIR="${OUTPUT_DIR:-model-dev/adapters/scheduled_run}"

python model-dev/training/finetune_lora.py \
  --config "$CONFIG" \
  --dataset_provenance_id "$PROVENANCE_ID" \
  --train_file "$DATA_PATH" \
  --adapter_output_dir "$OUTPUT_DIR" \
  --save_steps 500 \
  --eval_steps 250

# Optional: push to HF (requires HF_TOKEN)
# python -c "from model_dev.training.training_utils import checkpoint_and_push; checkpoint_and_push('$OUTPUT_DIR', save_to_hf=True)"
