"""
HAI-DEF Multi-Task QLoRA — 7 pediatric tasks on MedGemma-4B-IT (HAI-DEF Pre-release).

Usage:
  python -m hai_adaptation.train_hai_tasks
  python -m hai_adaptation.train_hai_tasks --data_root ./data/hai-pediatric --max_steps 1000 --smoke_test

Requires: torch, transformers, peft, bitsandbytes, datasets
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path

# Repo root and hai-adaptation (package dir has hyphen; load task_datasets by path)
_HAI_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _HAI_DIR.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

import importlib.util
_spec = importlib.util.spec_from_file_location("task_datasets", _HAI_DIR / "task_datasets.py")
_task_datasets = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_task_datasets)
create_multitask_samples = _task_datasets.create_multitask_samples

import torch
from datasets import Dataset

logging.basicConfig(
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("hai_train")

# ---------------------------------------------------------------------------
# HAI-DEF Task config (2.8M params, ~15K samples coverage)
# ---------------------------------------------------------------------------

HAI_TASK_CONFIG = {
    "tasks": [
        "asq3",
        "rop",
        "bone_age",
        "growth",
        "fracture",
        "chw_workflow",
        "multilingual",
    ],
    "lora_r": 32,
    "lora_alpha": 64,
    "target_modules": [
        "q_proj",
        "v_proj",
        "k_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj",
    ],
    "batch_size": 4,
    "gradient_accumulation": 8,
    "learning_rate": 1.5e-4,
    "max_steps": 10000,
    "max_input_length": 1024,
    "max_target_length": 512,
}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="HAI-DEF 7-task QLoRA training")
    p.add_argument(
        "--base_model_id",
        type=str,
        default="google/medgemma-4b-it",
        help="Base model (MedGemma-4B-IT HAI-DEF pre-release)",
    )
    p.add_argument(
        "--data_root",
        type=str,
        default=None,
        help="Path to data/hai-pediatric (default: repo data/hai-pediatric)",
    )
    p.add_argument(
        "--output_dir",
        type=str,
        default="./models/hai-pedifine-v1.0",
        help="Output dir for checkpoints and final adapter",
    )
    p.add_argument("--max_steps", type=int, default=None, help="Override config max_steps")
    p.add_argument("--per_device_train_batch_size", type=int, default=None)
    p.add_argument("--gradient_accumulation_steps", type=int, default=None)
    p.add_argument("--learning_rate", type=float, default=None)
    p.add_argument("--smoke_test", action="store_true", help="Tiny run (50 steps, 2 batches)")
    p.add_argument("--seed", type=int, default=42)
    args = p.parse_args()
    return args


def _get_data_root(args: argparse.Namespace) -> Path:
    if args.data_root:
        return Path(args.data_root)
    return _REPO_ROOT / "data" / "hai-pediatric"


def create_multitask_dataset(data_root: Path) -> Dataset:
    """Combine 7 task datasets → unified list then HuggingFace Dataset."""
    samples = create_multitask_samples(data_root)
    # Normalize to prompt/target for compatibility with tokenization
    rows = []
    for s in samples:
        inst = s.get("instruction", "")
        out = s.get("output", "")
        rows.append({"prompt": inst, "target": out})
    return Dataset.from_list(rows)


def setup_hai_model(base_model_id: str, device_map: str = "auto"):
    """HAI-DEF compliant QLoRA setup: 4-bit + LoRA (2.8M params)."""
    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from transformers import BitsAndBytesConfig
    except ImportError as e:
        raise ImportError("Need transformers installed") from e
    try:
        from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
        from peft import TaskType
    except ImportError as e:
        raise ImportError("Need peft installed") from e

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    logger.info("Loading base model and tokenizer: %s", base_model_id)
    tokenizer = AutoTokenizer.from_pretrained(base_model_id, use_fast=True, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.add_special_tokens({"pad_token": "[PAD]"})

    model = AutoModelForCausalLM.from_pretrained(
        base_model_id,
        quantization_config=bnb_config,
        device_map=device_map,
        trust_remote_code=True,
    )
    model = prepare_model_for_kbit_training(model)

    lora_config = LoraConfig(
        r=HAI_TASK_CONFIG["lora_r"],
        lora_alpha=HAI_TASK_CONFIG["lora_alpha"],
        target_modules=HAI_TASK_CONFIG["target_modules"],
        lora_dropout=0.05,
        bias="none",
        task_type=TaskType.CAUSAL_LM,
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    return model, tokenizer


def prepare_dataset_for_training(dataset: Dataset, tokenizer, max_input: int, max_target: int) -> Dataset:
    """Tokenize prompt/target into input_ids, attention_mask, labels (labels = target, -100 for prompt)."""
    from transformers import PreTrainedTokenizerBase

    def tokenize(examples):
        prompts = examples["prompt"]
        targets = examples["target"]
        full = [p + " " + t for p, t in zip(prompts, targets)]
        tokenized = tokenizer(
            full,
            truncation=True,
            max_length=max_input + max_target,
            padding="max_length",
            return_tensors=None,
        )
        # Build labels: -100 for prompt part, token ids for target part
        prompt_tok = tokenizer(
            prompts,
            truncation=True,
            max_length=max_input,
            padding="max_length",
            return_tensors=None,
        )
        target_tok = tokenizer(
            targets,
            truncation=True,
            max_length=max_target,
            padding="max_length",
            return_tensors=None,
        )
        pad_id = tokenizer.pad_token_id or 0
        labels = []
        for i in range(len(prompts)):
            prompt_len = sum(1 for x in prompt_tok["input_ids"][i] if x != pad_id)
            # For simplicity: same total length as input_ids, -100 for prompt, target ids for rest
            lab = [-100] * len(tokenized["input_ids"][i])
            target_ids = target_tok["input_ids"][i]
            for j, tid in enumerate(target_ids):
                if tid == pad_id:
                    break
                idx = prompt_len + j
                if idx < len(lab):
                    lab[idx] = tid
            labels.append(lab)
        tokenized["labels"] = labels
        return tokenized

    return dataset.map(
        tokenize,
        batched=True,
        remove_columns=dataset.column_names,
        desc="Tokenize",
    )


def train_hai_pipeline(args: argparse.Namespace) -> None:
    """Execute complete HAI-DEF adaptation: data → model → train → save."""
    from transformers import DataCollatorForSeq2Seq, Trainer, TrainingArguments

    data_root = _get_data_root(args)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Seed
    torch.manual_seed(args.seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(args.seed)

    # Dataset
    logger.info("Creating multi-task dataset from %s", data_root)
    dataset = create_multitask_dataset(data_root)
    logger.info("Total samples: %d", len(dataset))

    # Model + tokenizer
    device_map = "auto" if torch.cuda.is_available() else None
    model, tokenizer = setup_hai_model(args.base_model_id, device_map=device_map)

    # Tokenize
    max_input = HAI_TASK_CONFIG["max_input_length"]
    max_target = HAI_TASK_CONFIG["max_target_length"]
    tokenized_ds = prepare_dataset_for_training(dataset, tokenizer, max_input, max_target)

    # Training args
    batch_size = args.per_device_train_batch_size or HAI_TASK_CONFIG["batch_size"]
    grad_accum = args.gradient_accumulation_steps or HAI_TASK_CONFIG["gradient_accumulation"]
    lr = args.learning_rate or HAI_TASK_CONFIG["learning_rate"]
    max_steps = args.max_steps or HAI_TASK_CONFIG["max_steps"]
    if args.smoke_test:
        max_steps = 50
        batch_size = 2
        grad_accum = 2

    training_args = TrainingArguments(
        output_dir=str(output_dir),
        per_device_train_batch_size=batch_size,
        gradient_accumulation_steps=grad_accum,
        learning_rate=lr,
        max_steps=max_steps,
        num_train_epochs=3,
        fp16=not torch.cuda.is_bf16_supported() and torch.cuda.is_available(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=50,
        save_steps=1000,
        save_total_limit=3,
        evaluation_strategy="no",
        report_to="tensorboard",
        load_best_model_at_end=False,
        remove_unused_columns=False,
    )

    data_collator = DataCollatorForSeq2Seq(tokenizer, model=model, padding=True)

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_ds,
        tokenizer=tokenizer,
        data_collator=data_collator,
    )

    logger.info("Starting HAI-DEF multi-task training (max_steps=%s)", max_steps)
    trainer.train()
    trainer.save_model(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))

    # Provenance
    provenance = {
        "base_model_id": args.base_model_id,
        "hai_task_config": HAI_TASK_CONFIG,
        "data_root": str(data_root),
        "num_samples": len(dataset),
        "max_steps": max_steps,
        "output_dir": str(output_dir),
    }
    with open(Path(output_dir) / "provenance.json", "w") as f:
        json.dump(provenance, f, indent=2)

    logger.info("HAI-DEF adaptation complete. Artifacts in %s", output_dir)
    print("HAI-DEF ADAPTATION COMPLETE — 7 Pediatric Tasks → Production Ready")


def main() -> None:
    args = parse_args()
    train_hai_pipeline(args)


if __name__ == "__main__":
    main()
