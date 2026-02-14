#!/usr/bin/env python3
"""
Reproducible LoRA adapter training for PediScreen (runbook Page 7).
Uses accelerate + peft + transformers. Saves adapter_card.json with provenance.
"""
import argparse
import hashlib
import json
import logging
import os
import subprocess
import sys
from pathlib import Path

import torch
import yaml
from datasets import load_dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoProcessor,
    AutoTokenizer,
    DataCollatorForLanguageModeling,
    Trainer,
    TrainingArguments,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("train_adapter")


def get_git_commit_sha() -> str:
    """Return current git commit SHA or empty string."""
    try:
        out = subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=Path(__file__).resolve().parent.parent,
            text=True,
            stderr=subprocess.DEVNULL,
        )
        return out.strip()[:12]
    except Exception:
        return ""


def compute_manifest_sha256(paths: list[str]) -> str:
    """Compute SHA256 of concatenated manifest file contents."""
    h = hashlib.sha256()
    for p in sorted(paths):
        if os.path.exists(p):
            with open(p, "rb") as f:
                h.update(f.read())
    return h.hexdigest()[:16]


def load_config(config_path: str) -> dict:
    with open(config_path) as f:
        return yaml.safe_load(f)


def build_dataset(config: dict, tokenizer):
    """Load train/dev from JSONL. Expects 'text' column (or configurable)."""
    train_path = config.get("data", {}).get("train_path", "data/manifests/train.jsonl")
    dev_path = config.get("data", {}).get("dev_path", "data/manifests/dev.jsonl")
    text_col = config.get("data", {}).get("text_column", "text")
    max_len = config.get("data", {}).get("max_seq_length", 512)

    def tokenize(examples):
        return tokenizer(
            examples[text_col],
            truncation=True,
            max_length=max_len,
            padding="max_length",
            return_tensors=None,
        )

    if os.path.exists(train_path):
        data_files = {"train": train_path}
        if os.path.exists(dev_path):
            data_files["dev"] = dev_path
        ds = load_dataset("json", data_files=data_files)
        if "dev" not in ds:
            ds = ds["train"].train_test_split(test_size=0.2, seed=42)
            ds = {"train": ds["train"], "dev": ds["test"]}
    else:
        logger.warning("Manifest not found at %s; using minimal placeholder data.", train_path)
        from datasets import Dataset

        placeholder = [
            {"text": "[METADATA] child_age_months: 24\n[OBSERVATIONS] Child says few words.\n[LABEL] monitor"},
            {"text": "[METADATA] child_age_months: 36\n[OBSERVATIONS] Child on track.\n[LABEL] on_track"},
        ]
        d = Dataset.from_dict({"text": [p["text"] for p in placeholder]})
        split = d.train_test_split(test_size=0.2, seed=42)
        ds = {"train": split["train"], "dev": split["test"]}

    tokenized = ds.map(
        tokenize,
        batched=True,
        remove_columns=ds["train"].column_names if "train" in ds else ds.column_names,
    )

    # Add labels for causal LM (copy input_ids)
    def add_labels(examples):
        examples["labels"] = [list(x) for x in examples["input_ids"]]
        return examples

    tokenized = tokenized.map(add_labels, batched=True)
    return tokenized


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config/train.yaml", help="Path to train config YAML")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    torch.manual_seed(args.seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(args.seed)

    config_path = args.config
    if not os.path.isabs(config_path):
        config_path = str(Path(__file__).resolve().parent.parent / config_path)
    cfg = load_config(config_path)

    base_model = cfg.get("base_model", "google/medgemma-2b-it")
    adapter_out = cfg.get("adapter_out_dir", "outputs/adapters/pediscreen_v1")
    Path(adapter_out).mkdir(parents=True, exist_ok=True)

    # Load tokenizer and model
    logger.info("Loading base model: %s", base_model)
    tokenizer = AutoTokenizer.from_pretrained(base_model, trust_remote_code=True)
    processor = AutoProcessor.from_pretrained(base_model, trust_remote_code=True) if hasattr(AutoProcessor, "from_pretrained") else None

    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        trust_remote_code=True,
        torch_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
        device_map="auto" if torch.cuda.is_available() else None,
    )

    # PEFT config
    peft_cfg = cfg.get("peft", {})
    lora_config = LoraConfig(
        r=peft_cfg.get("r", 8),
        lora_alpha=peft_cfg.get("alpha", 32),
        target_modules=peft_cfg.get("target_modules", ["q_proj", "v_proj", "k_proj", "o_proj"]),
        lora_dropout=peft_cfg.get("lora_dropout", 0.05),
        bias=peft_cfg.get("bias", "none"),
        task_type=peft_cfg.get("task_type", "CAUSAL_LM"),
    )
    model = prepare_model_for_kbit_training(model)
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # Dataset
    tokenized = build_dataset(cfg, tokenizer)
    train_ds = tokenized["train"] if "train" in tokenized else tokenized
    eval_ds = tokenized.get("dev", tokenized.get("validation", None))

    # Training args
    train_cfg = cfg.get("train", {})
    training_args = TrainingArguments(
        output_dir=adapter_out,
        per_device_train_batch_size=train_cfg.get("per_device_train_batch_size", 2),
        gradient_accumulation_steps=train_cfg.get("gradient_accumulation_steps", 8),
        learning_rate=float(train_cfg.get("learning_rate", 2e-4)),
        num_train_epochs=train_cfg.get("epochs", 3),
        weight_decay=train_cfg.get("weight_decay", 0.01),
        warmup_ratio=train_cfg.get("warmup_ratio", 0.03),
        fp16=train_cfg.get("fp16", True) and torch.cuda.is_available(),
        logging_steps=train_cfg.get("logging_steps", 10),
        save_strategy=train_cfg.get("save_strategy", "epoch"),
        eval_strategy=train_cfg.get("eval_strategy", "steps"),
        eval_steps=train_cfg.get("eval_steps", 500),
        load_best_model_at_end=train_cfg.get("load_best_model_at_end", True),
        metric_for_best_model=train_cfg.get("metric_for_best_model", "eval_loss"),
        dataloader_num_workers=train_cfg.get("dataloader_num_workers", 0),
        report_to="none",
        seed=args.seed,
    )

    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer, mlm=False, pad_to_multiple_of=8
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        tokenizer=tokenizer,
        data_collator=data_collator,
    )

    logger.info("Starting training...")
    train_result = trainer.train()
    trainer.save_model(adapter_out)
    tokenizer.save_pretrained(adapter_out)

    # Save training metrics
    metrics_path = os.path.join(adapter_out, "training_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump({k: float(v) for k, v in train_result.metrics.items() if isinstance(v, (int, float))}, f, indent=2)

    # Manifest SHA (for provenance)
    data_cfg = cfg.get("data", {})
    manifest_paths = [
        data_cfg.get("train_path", "data/manifests/train.jsonl"),
        data_cfg.get("dev_path", "data/manifests/dev.jsonl"),
    ]
    manifest_sha = compute_manifest_sha256(manifest_paths)
    commit_sha = get_git_commit_sha()

    adapter_card = {
        "adapter_id": Path(adapter_out).name,
        "base_model": base_model,
        "peft_config": {k: v for k, v in lora_config.__dict__.items() if not k.startswith("_")},
        "data_manifest_sha256": manifest_sha,
        "training_command": f"accelerate launch training/train_adapter.py --config {args.config}",
        "metrics_summary": metrics_path,
        "commit_sha": commit_sha,
        "seed": args.seed,
    }
    card_path = os.path.join(adapter_out, "adapter_card.json")
    with open(card_path, "w") as f:
        json.dump(adapter_card, f, indent=2)

    logger.info("Adapter saved to %s", adapter_out)
    logger.info("adapter_card.json written to %s", card_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
