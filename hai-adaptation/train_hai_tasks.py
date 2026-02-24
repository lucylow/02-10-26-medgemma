"""
HAI-DEF multi-task QLoRA training for MedGemma-4B-IT.
7 pediatric tasks: ASQ-3, ROP, Bone Age, Growth, Fracture, CHW Workflow, Multilingual.

Run from repo root: PYTHONPATH=hai-adaptation python hai-adaptation/train_hai_tasks.py --output-dir models/hai-pedifine-v1.0
Or from this dir: python train_hai_tasks.py (after adding parent to path below).
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Allow running as script: python hai-adaptation/train_hai_tasks.py (directory name has hyphen)
_here = Path(__file__).resolve().parent
if _here.name == "hai-adaptation" and str(_here) not in sys.path:
    sys.path.insert(0, str(_here))

import torch
from datasets import Dataset, load_from_disk
from peft import LoraConfig, TaskType, get_peft_model, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    Trainer,
    TrainingArguments,
)

from task_datasets import get_task_builders, TASK_DATA_SUBDIRS

HAI_TASK_CONFIG = {
    "tasks": [
        "asq3", "rop", "bone_age", "growth", "fracture", "chw_workflow", "multilingual",
    ],
    "lora_r": 32,
    "lora_alpha": 64,
    "target_modules": [
        "q_proj", "v_proj",
        "gate_proj", "up_proj",
    ],
    "batch_size": 4,
    "gradient_accumulation": 8,
    "learning_rate": 1.5e-4,
    "max_steps": 10_000,
}

BASE_MODEL = "google/medgemma-4b-it"
DEFAULT_DATA_ROOT = "data/hai-pediatric"
OUTPUT_DIR = "models/hai-pedifine-v1.0"


def create_multitask_dataset(data_root: str | Path) -> Dataset:
    """Combine 7 task datasets into a single HF Dataset."""
    data_root = Path(data_root)
    builders = get_task_builders()
    all_records = []

    for task_name in HAI_TASK_CONFIG["tasks"]:
        if task_name not in builders:
            continue
        builder = builders[task_name]()
        task_dir = data_root / TASK_DATA_SUBDIRS.get(task_name, task_name)
        records = builder.build(data_root=task_dir)
        all_records.extend(records)

    if not all_records:
        for task_name in HAI_TASK_CONFIG["tasks"]:
            if task_name not in builders:
                continue
            builder = builders[task_name]()
            records = builder.build()
            all_records.extend(records)

    return Dataset.from_list(all_records)


def main() -> None:
    parser = argparse.ArgumentParser(description="HAI-DEF 7-task QLoRA training")
    parser.add_argument("--dataset", default=None, help="Path to pre-built dataset dir (optional)")
    parser.add_argument("--input-root", default=DEFAULT_DATA_ROOT, help="Data root for 7 tasks")
    parser.add_argument("--output-dir", default=OUTPUT_DIR)
    parser.add_argument("--base-model", default=BASE_MODEL)
    parser.add_argument("--max-steps", type=int, default=HAI_TASK_CONFIG["max_steps"])
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    torch.manual_seed(args.seed)

    if args.dataset and Path(args.dataset).exists():
        dataset = load_from_disk(args.dataset)
        if isinstance(dataset, dict):
            dataset = dataset.get("train", dataset[list(dataset.keys())[0]])
    else:
        dataset = create_multitask_dataset(args.input_root)

    if dataset.num_rows == 0:
        raise ValueError("No samples in dataset. Add data under data/hai-pediatric/<task>/ or run prepare_7_tasks.py.")

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
    )

    tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    model = prepare_model_for_kbit_training(model)

    lora_config = LoraConfig(
        r=HAI_TASK_CONFIG["lora_r"],
        lora_alpha=HAI_TASK_CONFIG["lora_alpha"],
        target_modules=HAI_TASK_CONFIG["target_modules"],
        task_type=TaskType.CAUSAL_LM,
        bias="none",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    def _tokenize(examples):
        texts = []
        for i in range(len(examples["instruction"])):
            inst = examples["instruction"][i] or ""
            out = examples["output"][i] or ""
            texts.append(f"{inst}\n\n{out}")
        enc = tokenizer(
            texts,
            padding="max_length",
            truncation=True,
            max_length=1024,
            return_tensors=None,
        )
        pad_id = tokenizer.pad_token_id or tokenizer.eos_token_id
        labels = []
        for j, ids in enumerate(enc["input_ids"]):
            lab = list(ids)
            if pad_id is not None:
                for k in range(len(lab)):
                    if lab[k] == pad_id:
                        lab[k] = -100
            labels.append(lab)
        enc["labels"] = labels
        return enc

    dataset = dataset.map(
        _tokenize,
        batched=True,
        remove_columns=dataset.column_names,
        desc="Tokenize",
    )

    training_args = TrainingArguments(
        output_dir=args.output_dir,
        per_device_train_batch_size=HAI_TASK_CONFIG["batch_size"],
        gradient_accumulation_steps=HAI_TASK_CONFIG["gradient_accumulation"],
        learning_rate=HAI_TASK_CONFIG["learning_rate"],
        num_train_epochs=3,
        max_steps=args.max_steps,
        bf16=True,
        logging_steps=50,
        save_steps=1000,
        save_total_limit=3,
        report_to=["tensorboard"],
        seed=args.seed,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
    )
    trainer.train()
    trainer.save_model(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)
    print("HAI-DEF multi-task QLoRA adaptation complete.")
    print("7 pediatric tasks -> production-ready PEFT checkpoints.")


if __name__ == "__main__":
    main()
