#!/usr/bin/env python3
"""
finetune_lora.py

LoRA / PEFT fine-tuning entrypoint for MedGemma-style adapters.

Purpose:
- Fine-tune a small adapter (LoRA) on top of a base HAI model for a downstream task.
- Support text-only and text+embedding training modes.
- Save adapter artifacts under adapters/<adapter_name>/ with metadata.

Usage (example):
python finetune_lora.py \
  --base_model_id "huggingface/medgemma-small" \
  --adapter_name "pedi_lang_v1" \
  --dataset_path "./data/pilot_small.jsonl" \
  --output_dir "../adapters/pedi_lang_v1" \
  --per_device_train_batch_size 8 \
  --num_train_epochs 2 \
  --learning_rate 2e-4 \
  --seed 1234 \
  --smoke_test

Note: This script is intended for development and small-scale experiments.
For large runs, run under accelerate or a multi-GPU config and consider bitsandbytes.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional

# Ensure model-dev/training is on path when run from repo root
_TRAINING_DIR = Path(__file__).resolve().parent
if str(_TRAINING_DIR) not in sys.path:
    sys.path.insert(0, str(_TRAINING_DIR))

import torch
import random
import numpy as np

from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    Trainer,
    TrainingArguments,
    DataCollatorForSeq2Seq,
)
from datasets import Dataset, load_dataset

# PEFT imports
try:
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
except Exception:
    get_peft_model = None
    LoraConfig = None
    prepare_model_for_kbit_training = None

# Local utilities
from training_utils import (
    set_seed,
    load_jsonl_dataset,
    prepare_dataset_for_training,
    save_provenance,
    safe_makedir,
    make_synthetic_dataset,
)

logging.basicConfig(
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("finetune_lora")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fine-tune LoRA adapter for MedGemma-style model")
    parser.add_argument("--base_model_id", type=str, required=True, help="HF model id or local path for base model")
    parser.add_argument("--adapter_name", type=str, required=True, help="Name of the adapter (dir under adapters/)")
    parser.add_argument("--dataset_path", type=str, required=False, default=None, help="Path to dataset (jsonl or HF id)")
    parser.add_argument("--output_dir", type=str, required=True, help="Where to save adapter artifacts")
    parser.add_argument("--per_device_train_batch_size", type=int, default=8)
    parser.add_argument("--num_train_epochs", type=float, default=1.0)
    parser.add_argument("--learning_rate", type=float, default=2e-4)
    parser.add_argument("--weight_decay", type=float, default=0.0)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--max_input_length", type=int, default=512)
    parser.add_argument("--max_target_length", type=int, default=128)
    parser.add_argument("--smoke_test", action="store_true", help="Run tiny smoke-test with synthetic data")
    parser.add_argument("--save_steps", type=int, default=500)
    parser.add_argument("--logging_steps", type=int, default=50)
    parser.add_argument("--push_to_hub", action="store_true", help="Push adapter to HF Hub (requires HF token env)")
    parser.add_argument("--dataset_provenance_id", type=str, default=None, help="Provenance id to record")
    args = parser.parse_args()
    return args


def build_peft_config(
    r: int = 8,
    lora_alpha: int = 32,
    target_modules: Optional[list] = None,
) -> "LoraConfig":
    if target_modules is None:
        # default target modules (names depend on model architecture)
        target_modules = ["q_proj", "v_proj", "k_proj", "o_proj", "dense", "dense_h_to_4h"]
    return LoraConfig(
        r=r,
        lora_alpha=lora_alpha,
        target_modules=target_modules,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )


def main() -> None:
    args = parse_args()
    set_seed(args.seed)

    # Environment / paths
    output_dir = Path(args.output_dir)
    safe_makedir(output_dir, exist_ok=True)
    adapter_dir = Path("model-dev/adapters") / args.adapter_name
    safe_makedir(adapter_dir, exist_ok=True)

    # Load tokenizer and base model
    logger.info("Loading base model and tokenizer: %s", args.base_model_id)
    tokenizer = AutoTokenizer.from_pretrained(args.base_model_id, use_fast=True)
    # ensure tokenizer has pad token
    if tokenizer.pad_token is None:
        tokenizer.add_special_tokens({"pad_token": "[PAD]"})
    # Model
    model = AutoModelForCausalLM.from_pretrained(
        args.base_model_id,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
    )

    # Prepare for k-bit training if available (optional)
    if prepare_model_for_kbit_training is not None:
        try:
            model = prepare_model_for_kbit_training(model)
        except Exception:
            logger.warning("prepare_model_for_kbit_training not applied (optional)")

    # PEFT / LoRA setup
    if get_peft_model is None or LoraConfig is None:
        logger.error("peft library not available. Install 'peft' to enable LoRA. Exiting.")
        sys.exit(1)

    peft_config = build_peft_config()
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # Dataset loading
    if args.smoke_test or args.dataset_path is None:
        logger.info("Creating synthetic smoke-test dataset.")
        ds = make_synthetic_dataset(32)
    else:
        # support jsonl path or HF dataset id
        logger.info("Loading dataset: %s", args.dataset_path)
        ds = load_jsonl_dataset(args.dataset_path)

    # Prepare dataset (tokenize, collate)
    tokenized_ds = prepare_dataset_for_training(
        ds,
        tokenizer,
        max_input_length=args.max_input_length,
        max_target_length=args.max_target_length,
    )

    # TrainingArguments and Trainer
    train_args = TrainingArguments(
        output_dir=str(output_dir),
        per_device_train_batch_size=args.per_device_train_batch_size,
        num_train_epochs=args.num_train_epochs,
        learning_rate=args.learning_rate,
        weight_decay=args.weight_decay,
        fp16=torch.cuda.is_available(),
        logging_steps=args.logging_steps,
        save_steps=args.save_steps,
        save_total_limit=3,
        remove_unused_columns=False,
        report_to="none",
    )

    # Data collator
    data_collator = DataCollatorForSeq2Seq(tokenizer, model=model)

    # Trainer
    trainer = Trainer(
        model=model,
        args=train_args,
        train_dataset=tokenized_ds,
        tokenizer=tokenizer,
        data_collator=data_collator,
    )

    # Train (with error handling)
    try:
        logger.info("Starting training for adapter '%s' ...", args.adapter_name)
        train_result = trainer.train()
        trainer.save_model(str(adapter_dir))
        # Save tokenizer copy
        tokenizer.save_pretrained(str(adapter_dir))
        # Also save peft config/adapter
        if hasattr(model, "save_pretrained"):
            logger.info("Saving peft adapter to: %s", adapter_dir)
            model.save_pretrained(str(adapter_dir))
    except Exception as e:
        logger.exception("Training failed: %s", e)
        raise

    # Save run metadata / provenance
    provenance = {
        "adapter_name": args.adapter_name,
        "base_model_id": args.base_model_id,
        "dataset_provenance_id": args.dataset_provenance_id,
        "training_args": vars(args),
        "trainer_state": getattr(trainer.state, "log_history", []),
    }
    save_provenance(provenance, output_dir / "provenance.json")

    logger.info("Adapter training complete. Artifacts saved to %s", adapter_dir)

    # Optionally push to hub (adapter only - requires HF token in env)
    if args.push_to_hub:
        try:
            from huggingface_hub import HfApi
            tok = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
            if tok:
                api = HfApi(token=tok)
                api.upload_folder(
                    folder_path=str(adapter_dir),
                    repo_id=args.adapter_name,
                    repo_type="model",
                    token=tok,
                )
                logger.info("Pushed adapter to HF Hub: %s", args.adapter_name)
            else:
                logger.warning("Push to hub skipped: set HF_TOKEN or HUGGING_FACE_HUB_TOKEN")
        except Exception as e:
            logger.warning("Push to hub failed: %s", e)

    logger.info("Done.")


if __name__ == "__main__":
    main()
