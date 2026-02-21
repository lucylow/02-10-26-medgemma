"""
MedGemma-4B QLoRA fine-tuning for pediatric developmental screening.

Implementation-ready recipe:
- Base: google/medgemma-4b-it (instruction-tuned)
- Quantization: 4-bit NF4, bfloat16 compute, double quant
- LoRA: r=16, alpha=16, dropout=0.05
- Target: q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj
- SFT on instruction-style medical/pediatric pairs

Adjustments:
- VRAM pressure: restrict to attention only (q_proj, k_proj, v_proj, o_proj)
- Small datasets (100–500): raise lora_dropout toward 0.1
- Large (>5k): dropout 0.0–0.03; consider r=32 if underfitting

Usage:
  python training/finetune_lora.py --data data/synthetic/v1.0/train.parquet
  python training/finetune_lora.py --train_file data/synth_train.jsonl --output_dir adapters/pediscreen_v1
  python training/finetune_lora.py --model_name_or_path google/medgemma-2b-it --train_file data/synth_train.jsonl --output_dir adapters/pediscreen_v1 --num_train_epochs 3
"""
from __future__ import annotations

import argparse
from pathlib import Path

import datasets
import torch
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    Trainer,
    TrainingArguments,
)

try:
    from config.settings import settings
    BASE_MODEL = getattr(settings, "MEDGEMMA_MODEL_PATH", "google/medgemma-4b-it")
except ImportError:
    BASE_MODEL = "google/medgemma-4b-it"

# ─── QLoRA: 4-bit NF4 with bfloat16 compute ──────────────────────────────────
BITSANBYTES_CONFIG = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
)

# ─── LoRA config (MedGemma-4B recommended for medical tasks) ─────────────────
LORA_R = 16
LORA_ALPHA = 16
LORA_DROPOUT = 0.05
# Gemma-style linear projections; use attention-only for VRAM limits
TARGET_MODULES = [
    "q_proj", "k_proj", "v_proj", "o_proj",
    "gate_proj", "up_proj", "down_proj",
]
MODULES_TO_SAVE = ["lm_head", "embed_tokens"]  # optional; omit to save VRAM

OUTPUT_DIR = "outputs/medgemma-4b-peds-qlora"
ADAPTER_DIR = "outputs/medgemma-4b-peds-qlora-adapter"


def load_dataset(data_path: str) -> datasets.DatasetDict:
    """Load dataset from parquet or HuggingFace datasets path."""
    path = Path(data_path)
    if path.suffix == ".parquet" or (path.is_dir() and (path / "train.parquet").exists()):
        # Parquet: expect 'text' column (or we build from messages)
        if path.is_file():
            ds = datasets.Dataset.from_parquet(str(path))
        else:
            ds = datasets.Dataset.from_parquet(str(path / "train.parquet"))
        # Simple 90/10 split if no validation
        split = ds.train_test_split(test_size=0.1, seed=42)
        return datasets.DatasetDict({"train": split["train"], "validation": split["test"]})
    # HuggingFace dataset on disk
    return datasets.load_from_disk(str(path))


def load_dataset_from_jsonl(train_file: str, max_length: int = 512) -> datasets.DatasetDict:
    """Load JSONL (e.g. from data.synth) and build HF Dataset with 'text' column."""
    from training.utils import JsonlTextDataset

    ds = JsonlTextDataset(train_file)
    texts = [s["text"] for s in ds.samples]
    labels = [s.get("label") or s.get("expected_risk") or "unknown" for s in ds.samples]
    if not texts:
        raise ValueError(f"No samples in {train_file}")
    hf_ds = datasets.Dataset.from_dict({"text": texts, "label": labels})
    test_size = min(0.1, max(1, len(hf_ds) // 10))
    split = hf_ds.train_test_split(test_size=test_size, seed=42)
    return datasets.DatasetDict({"train": split["train"], "validation": split["test"]})


def collate_fn(tokenizer, max_length: int = 2048):
    """Collate batch: tokenize texts, set labels for causal LM (mask padding with -100)."""

    def _collate(batch):
        texts = [b["text"] for b in batch]
        enc = tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=max_length,
            return_tensors="pt",
        )
        labels = enc["input_ids"].clone()
        pad_id = tokenizer.pad_token_id or tokenizer.eos_token_id
        if pad_id is not None:
            labels[labels == pad_id] = -100
        enc["labels"] = labels
        return enc

    return _collate


def main() -> None:
    parser = argparse.ArgumentParser(description="MedGemma QLoRA/LoRA fine-tuning")
    parser.add_argument("--model_name_or_path", default=BASE_MODEL, help="Base model (e.g. google/medgemma-2b-it)")
    parser.add_argument("--data", default=None, help="Path to parquet or HuggingFace dataset")
    parser.add_argument("--train_file", default=None, help="Path to JSONL (e.g. data/synth_train.jsonl)")
    parser.add_argument("--output-dir", default=OUTPUT_DIR)
    parser.add_argument("--adapter-dir", default=None, help="Adapter save path (defaults to output-dir)")
    parser.add_argument("--max-length", type=int, default=512)
    parser.add_argument("--per_device_train_batch_size", type=int, default=8)
    parser.add_argument("--num_train_epochs", type=int, default=3)
    parser.add_argument("--learning_rate", type=float, default=5e-5)
    parser.add_argument("--weight_decay", type=float, default=0.01)
    parser.add_argument("--lora_rank", type=int, default=8)
    parser.add_argument("--lora_alpha", type=int, default=16)
    parser.add_argument("--max_steps", type=int, default=-1, help="Stop after N steps (-1 = full epochs)")
    parser.add_argument("--attention-only", action="store_true", help="LoRA on attention only (VRAM save)")
    args = parser.parse_args()

    data_path = args.train_file or args.data or "my_finetune_dataset"
    adapter_dir = args.adapter_dir or args.output_dir
    model_name = args.model_name_or_path
    lora_r = args.lora_rank
    lora_alpha = args.lora_alpha

    target_modules = (
        ["q_proj", "k_proj", "v_proj", "o_proj"]
        if args.attention_only
        else TARGET_MODULES
    )

    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        trust_remote_code=True,
        device_map="auto",
        quantization_config=BITSANBYTES_CONFIG,
    )
    model = prepare_model_for_kbit_training(model)

    lora_config = LoraConfig(
        r=lora_r,
        lora_alpha=lora_alpha,
        lora_dropout=LORA_DROPOUT,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=target_modules,
        modules_to_save=MODULES_TO_SAVE,
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    if args.train_file and Path(args.train_file).suffix == ".jsonl":
        ds = load_dataset_from_jsonl(args.train_file, max_length=args.max_length)
    else:
        ds = load_dataset(data_path)
    if "text" not in ds["train"].column_names:
        raise ValueError(
            "Dataset must have 'text' column. Run training/prepare_sft_data.py first."
        )

    training_args = TrainingArguments(
        output_dir=args.output_dir,
        per_device_train_batch_size=args.per_device_train_batch_size,
        gradient_accumulation_steps=8,
        learning_rate=args.learning_rate,
        weight_decay=args.weight_decay,
        num_train_epochs=args.num_train_epochs,
        max_steps=args.max_steps if args.max_steps > 0 else -1,
        lr_scheduler_type="cosine",
        warmup_ratio=0.03,
        bf16=True,
        logging_steps=20,
        save_steps=500,
        save_total_limit=3,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=ds["train"],
        eval_dataset=ds["validation"],
        data_collator=collate_fn(tokenizer, max_length=args.max_length),
    )

    trainer.train()

    # Save adapter and tokenizer
    Path(adapter_dir).mkdir(parents=True, exist_ok=True)
    model.save_pretrained(adapter_dir)
    tokenizer.save_pretrained(adapter_dir)
    print(f"Adapter saved to {adapter_dir}")


if __name__ == "__main__":
    main()
