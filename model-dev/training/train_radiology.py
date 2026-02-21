#!/usr/bin/env python3
"""
train_radiology.py — Production MedGemma-4B Radiology Fine-tuning (QLoRA)

Target: MedGemma-4B-IT (4.2GB base → Q4_K_M ~2.8GB with 4-bit)
Tasks: Bone Age (Greulich-Pyle), ROP (Zone/Stage/Plus), Fracture detection
Memory: 12GB VRAM (A100/H100) | 24GB RAM (Colab Pro)
Training: 18–24h typical (3 epochs, ~8K samples), batch_size=2, grad_accum=8

Usage (from repo root):
  python model-dev/training/train_radiology.py --data_dir ./pedirad-custom --output_dir ./models/medgemma-4b-radiology
  python model-dev/training/train_radiology.py --data_dir ./data/pedirad-8k --output_dir ./models/medgemma-4b-radiology --smoke_test
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# Repo root and training dir on path
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_TRAINING_DIR = Path(__file__).resolve().parent
for _p in (str(_REPO_ROOT), str(_TRAINING_DIR)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import torch

# Optional VLM (MedGemma-4B has vision + language)
try:
    from transformers import AutoModelForImageTextToText
except ImportError:
    AutoModelForImageTextToText = None
try:
    from transformers import AutoModelForCausalLM, AutoProcessor
except ImportError:
    AutoModelForCausalLM = AutoProcessor = None
try:
    from transformers import BitsAndBytesConfig
except ImportError:
    BitsAndBytesConfig = None
try:
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, TaskType
except ImportError:
    LoraConfig = get_peft_model = prepare_model_for_kbit_training = TaskType = None
try:
    from transformers import Trainer, TrainingArguments
except ImportError:
    Trainer = TrainingArguments = None

from training_utils import set_seed, safe_makedir

# Local radiology dataset (unified bone age / ROP / fracture)
from radiology_processor import PediatricRadiologyDataset, load_radiology_annotations


TRAINING_CONFIG = {
    "model_name": "google/medgemma-4b-it",
    "max_length": 2048,
    "lora_r": 32,
    "lora_alpha": 64,
    "lora_dropout": 0.1,
    "batch_size": 2,
    "gradient_accumulation": 8,
    "lr": 1e-4,
    "epochs": 3,
    "warmup_steps": 200,
    "save_steps": 500,
    "logging_steps": 50,
    "eval_steps": 500,
}

# LoRA target modules: decoder (LLM) only by default; vision can be added for full VLM tuning
LORA_TARGET_MODULES_LLM = [
    "q_proj", "k_proj", "v_proj", "o_proj",
    "gate_proj", "up_proj", "down_proj",
]


def _get_model_and_processor(
    model_name: str,
    use_4bit: bool = True,
    device_map: str = "auto",
):
    """Load MedGemma-4B (or compatible VLM) with optional 4-bit quantization."""
    if AutoProcessor is None:
        raise ImportError("transformers required for AutoProcessor")
    processor = AutoProcessor.from_pretrained(model_name, trust_remote_code=True)
    if getattr(processor, "tokenizer", None) and (processor.tokenizer.pad_token is None):
        processor.tokenizer.pad_token = processor.tokenizer.eos_token

    if use_4bit and BitsAndBytesConfig is not None:
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True,
        )
        load_kw = {"quantization_config": bnb_config}
    else:
        bnb_config = None
        load_kw = {"torch_dtype": torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16}

    load_kw["device_map"] = device_map
    load_kw["trust_remote_code"] = True

    if AutoModelForImageTextToText is not None:
        try:
            model = AutoModelForImageTextToText.from_pretrained(model_name, **load_kw)
            return model, processor
        except Exception:
            pass
    if AutoModelForCausalLM is not None:
        model = AutoModelForCausalLM.from_pretrained(model_name, **load_kw)
        return model, processor
    raise RuntimeError("Need AutoModelForImageTextToText or AutoModelForCausalLM (transformers)")


def _freeze_vision_encoder(model) -> None:
    """Freeze vision tower to save VRAM and focus LoRA on language."""
    for name, param in model.named_parameters():
        if "vision" in name.lower() or "vision_tower" in name:
            param.requires_grad = False


def _build_lora_config(config: dict):
    if LoraConfig is None or TaskType is None:
        raise ImportError("peft required for LoRA")
    return LoraConfig(
        r=config.get("lora_r", 32),
        lora_alpha=config.get("lora_alpha", 64),
        target_modules=LORA_TARGET_MODULES_LLM,
        lora_dropout=config.get("lora_dropout", 0.1),
        bias="none",
        task_type=TaskType.CAUSAL_LM,
    )


def _collate_fn(examples, processor, pad_token_id=0):
    """Stack batch from PediatricRadiologyDataset __getitem__."""
    input_ids = torch.nn.utils.rnn.pad_sequence(
        [e["input_ids"] for e in examples],
        batch_first=True,
        padding_value=pad_token_id,
    )
    attention_mask = torch.nn.utils.rnn.pad_sequence(
        [e["attention_mask"] for e in examples],
        batch_first=True,
        padding_value=0,
    )
    labels = torch.nn.utils.rnn.pad_sequence(
        [e["labels"] for e in examples],
        batch_first=True,
        padding_value=-100,
    )
    return {
        "input_ids": input_ids,
        "attention_mask": attention_mask,
        "labels": labels,
    }


def train(
    data_dir: str,
    output_dir: str,
    adapter_output_dir: str | None = None,
    max_samples: int | None = None,
    smoke_test: bool = False,
    use_4bit: bool = True,
    epochs: int | None = None,
    batch_size: int | None = None,
    gradient_accumulation_steps: int | None = None,
    lr: float | None = None,
    save_steps: int | None = None,
    eval_steps: int | None = None,
    seed: int = 42,
) -> None:
    """Run QLoRA radiology fine-tuning and save adapter."""
    set_seed(seed)
    cfg = {**TRAINING_CONFIG}
    if epochs is not None:
        cfg["epochs"] = epochs
    if batch_size is not None:
        cfg["batch_size"] = batch_size
    if gradient_accumulation_steps is not None:
        cfg["gradient_accumulation"] = gradient_accumulation_steps
    if lr is not None:
        cfg["lr"] = lr
    if save_steps is not None:
        cfg["save_steps"] = save_steps
    if eval_steps is not None:
        cfg["eval_steps"] = eval_steps

    out_path = Path(output_dir)
    safe_makedir(out_path, exist_ok=True)
    adapter_dir = Path(adapter_output_dir or str(out_path / "lora"))
    safe_makedir(adapter_dir, exist_ok=True)

    # Load model + processor
    print("Loading model and processor:", cfg["model_name"])
    model, processor = _get_model_and_processor(cfg["model_name"], use_4bit=use_4bit)
    _freeze_vision_encoder(model)

    if prepare_model_for_kbit_training is not None:
        model = prepare_model_for_kbit_training(model)
    lora_config = _build_lora_config(cfg)
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # Datasets
    max_n = 128 if smoke_test else max_samples
    train_ds = PediatricRadiologyDataset(
        data_dir,
        split="train",
        max_samples=max_n,
        processor_name=cfg["model_name"],
        max_length=cfg["max_length"],
    )
    val_ann = load_radiology_annotations(data_dir, "val", max_samples=256)
    if val_ann:
        val_ds = PediatricRadiologyDataset(
            data_dir,
            split="val",
            max_samples=min(256, len(val_ann)),
            processor_name=cfg["model_name"],
            max_length=cfg["max_length"],
        )
    else:
        val_ds = None

    pad_id = getattr(processor.tokenizer, "pad_token_id", None) or 0

    def data_collator(examples):
        return _collate_fn(examples, processor, pad_token_id=pad_id)

    training_args = TrainingArguments(
        output_dir=str(out_path),
        per_device_train_batch_size=cfg["batch_size"],
        gradient_accumulation_steps=cfg["gradient_accumulation"],
        learning_rate=cfg["lr"],
        num_train_epochs=cfg["epochs"],
        warmup_steps=cfg["warmup_steps"],
        fp16=not torch.cuda.is_bf16_supported() and torch.cuda.is_available(),
        bf16=torch.cuda.is_bf16_supported(),
        save_steps=cfg["save_steps"],
        logging_steps=cfg["logging_steps"],
        evaluation_strategy="steps" if val_ds else "no",
        eval_steps=cfg["eval_steps"] if val_ds else None,
        save_total_limit=3,
        load_best_model_at_end=bool(val_ds),
        metric_for_best_model="eval_loss" if val_ds else None,
        report_to="tensorboard",
        dataloader_pin_memory=False,
        remove_unused_columns=False,
    )

    if smoke_test:
        training_args.max_steps = 4
        training_args.logging_steps = 1
        training_args.save_steps = 2

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        data_collator=data_collator,
        tokenizer=processor.tokenizer,
    )

    print("Starting MedGemma-4B Radiology QLoRA training...")
    trainer.train()
    trainer.save_model(str(adapter_dir))
    processor.save_pretrained(str(adapter_dir))
    print("Adapter saved to:", adapter_dir)


def main():
    p = argparse.ArgumentParser(description="MedGemma-4B Radiology QLoRA training")
    p.add_argument("--data_dir", type=str, default="./pedirad-custom", help="Root of pedirad-custom or pedirad-8k")
    p.add_argument("--output_dir", type=str, default="./models/medgemma-4b-radiology")
    p.add_argument("--adapter_output_dir", type=str, default=None, help="Default: <output_dir>/lora")
    p.add_argument("--max_samples", type=int, default=None)
    p.add_argument("--smoke_test", action="store_true")
    p.add_argument("--no_4bit", action="store_true", help="Disable 4-bit quantization")
    p.add_argument("--epochs", type=int, default=None)
    p.add_argument("--batch_size", type=int, default=None)
    p.add_argument("--gradient_accumulation_steps", type=int, default=None)
    p.add_argument("--lr", type=float, default=None)
    p.add_argument("--save_steps", type=int, default=None)
    p.add_argument("--eval_steps", type=int, default=None)
    p.add_argument("--seed", type=int, default=42)
    args = p.parse_args()

    train(
        data_dir=args.data_dir,
        output_dir=args.output_dir,
        adapter_output_dir=args.adapter_output_dir,
        max_samples=args.max_samples,
        smoke_test=args.smoke_test,
        use_4bit=not args.no_4bit,
        epochs=args.epochs,
        batch_size=args.batch_size,
        gradient_accumulation_steps=args.gradient_accumulation_steps,
        lr=args.lr,
        save_steps=args.save_steps,
        eval_steps=args.eval_steps,
        seed=args.seed,
    )


if __name__ == "__main__":
    main()
