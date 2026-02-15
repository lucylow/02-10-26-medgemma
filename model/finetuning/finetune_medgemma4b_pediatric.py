#!/usr/bin/env python3
"""
MedGemma-4B pediatric fine-tuning with QLoRA.
- Base: google/medgemma-4b-it (instruction-tuned multimodal)
- LoRA on decoder only (image encoder frozen)
- 4-bit NF4 quantization for memory efficiency
- CDS-only output schema (risk, summary, rationale, next_steps)
- Patient-level dataset splits
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Allow import when run from repo root: python model/finetuning/finetune_medgemma4b_pediatric.py
_script_dir = Path(__file__).resolve().parent
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))

import torch
from datasets import DatasetDict, concatenate_datasets
from PIL import Image
from transformers import (
    AutoProcessor,
    AutoModelForImageTextToText,
    BitsAndBytesConfig,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer
from trl.trainer import SFTConfig

from pediatric_dataset import load_pediatric_dataset, get_cds_safety_dataset


MODEL_ID = "google/medgemma-4b-it"

# LoRA: decoder layers only (attention + MLP); rank 16, alpha 16 per plan
LORA_TARGET_MODULES = [
    "q_proj", "k_proj", "v_proj", "o_proj",
    "gate_proj", "up_proj", "down_proj",
]


def freeze_vision_encoder(model) -> None:
    """Freeze vision/encoder parameters; only train decoder + LoRA."""
    for name, param in model.named_parameters():
        if "vision_tower" in name or "vision_model" in name or "model.vision" in name:
            param.requires_grad = False


def get_model_and_processor(
    model_id: str = MODEL_ID,
    use_4bit: bool = True,
    bnb_4bit_compute_dtype: torch.dtype = torch.bfloat16,
    device_map: str = "auto",
):
    """Load MedGemma-4B with optional 4-bit quantization."""
    processor = AutoProcessor.from_pretrained(model_id, trust_remote_code=True)
    processor.tokenizer.padding_side = "right"

    if use_4bit:
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=bnb_4bit_compute_dtype,
            bnb_4bit_use_double_quant=True,
        )
        model = AutoModelForImageTextToText.from_pretrained(
            model_id,
            quantization_config=bnb_config,
            device_map=device_map,
            trust_remote_code=True,
        )
    else:
        model = AutoModelForImageTextToText.from_pretrained(
            model_id,
            torch_dtype=bnb_4bit_compute_dtype,
            device_map=device_map,
            trust_remote_code=True,
        )

    return model, processor


def create_collate_fn(processor):
    """Build data collator for MedGemma multimodal SFT (single-image + text).
    Uses processor.apply_chat_template per example for correct image handling.
    """

    def collate_fn(examples):
        batch_inputs = []
        for ex in examples:
            # apply_chat_template with tokenize=True handles images in messages
            inp = processor.apply_chat_template(
                ex["messages"],
                tokenize=True,
                add_generation_prompt=False,
                return_dict=True,
                return_tensors="pt",
            )
            batch_inputs.append(inp)

        # Stack/pad: assume all have input_ids, attention_mask; pixel_values may vary
        input_ids = torch.nn.utils.rnn.pad_sequence(
            [b["input_ids"].squeeze(0) for b in batch_inputs],
            batch_first=True,
            padding_value=processor.tokenizer.pad_token_id or 0,
        )
        attention_mask = torch.nn.utils.rnn.pad_sequence(
            [b["attention_mask"].squeeze(0) for b in batch_inputs],
            batch_first=True,
            padding_value=0,
        )

        batch = {"input_ids": input_ids, "attention_mask": attention_mask}

        pv_list = [b["pixel_values"] for b in batch_inputs if b.get("pixel_values") is not None]
        if pv_list:
            batch["pixel_values"] = torch.cat(pv_list, dim=0)

        labels = input_ids.clone()
        pad_id = processor.tokenizer.pad_token_id
        if pad_id is not None:
            labels[labels == pad_id] = -100
        for tok_id in (262144,):  # Gemma image token
            labels[labels == tok_id] = -100
        batch["labels"] = labels

        return batch

    return collate_fn


def train(
    data_path: str,
    output_dir: str = "./outputs/pediscreen-4b-lora",
    images_dir: str | None = None,
    add_cds_safety: bool = True,
    num_epochs: int = 3,
    per_device_train_batch_size: int = 2,
    gradient_accumulation_steps: int = 4,
    learning_rate: float = 1e-4,
    warmup_ratio: float = 0.1,
    lora_r: int = 16,
    lora_alpha: int = 16,
    use_4bit: bool = True,
    max_seq_length: int = 2048,
    logging_steps: int = 10,
    save_strategy: str = "epoch",
    bf16: bool = True,
    seed: int = 42,
):
    """Run MedGemma-4B pediatric QLoRA fine-tuning."""
    print(f"Loading model and processor: {MODEL_ID}")
    model, processor = get_model_and_processor(
        model_id=MODEL_ID,
        use_4bit=use_4bit,
    )

    # Freeze vision encoder, apply LoRA
    freeze_vision_encoder(model)
    model = prepare_model_for_kbit_training(model)

    peft_config = LoraConfig(
        r=lora_r,
        lora_alpha=lora_alpha,
        target_modules=LORA_TARGET_MODULES,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    print(f"Loading pediatric dataset: {data_path}")
    dataset = load_pediatric_dataset(
        data_path,
        images_dir=images_dir,
        seed=seed,
    )

    if add_cds_safety:
        safety_ds = get_cds_safety_dataset()
        train_with_safety = concatenate_datasets([
            dataset["train"],
            safety_ds,
            safety_ds,
        ])
        dataset = DatasetDict({
            "train": train_with_safety,
            "validation": dataset["validation"],
            "test": dataset["test"],
        })

    training_args = SFTConfig(
        output_dir=output_dir,
        per_device_train_batch_size=per_device_train_batch_size,
        per_device_eval_batch_size=1,
        gradient_accumulation_steps=gradient_accumulation_steps,
        num_train_epochs=num_epochs,
        learning_rate=learning_rate,
        warmup_ratio=warmup_ratio,
        lr_scheduler_type="cosine",
        logging_steps=logging_steps,
        save_strategy=save_strategy,
        save_total_limit=3,
        bf16=bf16,
        report_to="tensorboard",
        seed=seed,
        max_seq_length=max_seq_length,
        dataset_kwargs={"skip_prepare_dataset": True},
        remove_unused_columns=False,
        gradient_checkpointing=True,
        gradient_checkpointing_kwargs={"use_reentrant": False},
    )

    collate_fn = create_collate_fn(processor)

    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=dataset["train"],
        eval_dataset=dataset["validation"],
        processing_class=processor,
        data_collator=collate_fn,
    )

    print("Starting training...")
    trainer.train()

    print(f"Saving adapters to {output_dir}")
    trainer.save_model(output_dir)
    processor.save_pretrained(output_dir)

    print("Done.")


def main():
    parser = argparse.ArgumentParser(description="MedGemma-4B pediatric QLoRA fine-tuning")
    parser.add_argument("--data-path", type=str, required=True, help="Path to pediatric JSON/JSONL")
    parser.add_argument("--images-dir", type=str, default=None, help="Base dir for image paths")
    parser.add_argument("--output-dir", type=str, default="./outputs/pediscreen-4b-lora")
    parser.add_argument("--no-cds-safety", action="store_true", help="Skip CDS safety examples")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=2)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--lora-r", type=int, default=16)
    parser.add_argument("--lora-alpha", type=int, default=16)
    parser.add_argument("--no-4bit", action="store_true", help="Disable 4-bit quantization")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    train(
        data_path=args.data_path,
        output_dir=args.output_dir,
        images_dir=args.images_dir,
        add_cds_safety=not args.no_cds_safety,
        num_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        learning_rate=args.lr,
        lora_r=args.lora_r,
        lora_alpha=args.lora_alpha,
        use_4bit=not args.no_4bit,
        seed=args.seed,
    )


if __name__ == "__main__":
    main()
