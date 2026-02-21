"""
LoRA/PEFT fine-tuning for MedGemma-like HAI models (model-dev).

Purpose: Reproducible adapter training with provenance, config-driven hyperparameters,
streaming-friendly data load, mixed precision, checkpointing, and eval callback.
Inputs: --dataset_provenance_id (required unless --allow-local-dev), --dataset_path or
--train_file, --config YAML, CLI overrides.
Outputs: Adapter in adapters/<adapter-id>/, provenance JSON, adapter_card.md.

Usage:
  python model-dev/training/finetune_lora.py --dataset_provenance_id my-dataset-v1 \\
    --train_file data/synth_train.jsonl --adapter_output_dir model-dev/adapters/my_adapter
  python model-dev/training/finetune_lora.py --allow-local-dev --train_file data/synth.jsonl \\
    --adapter_output_dir model-dev/adapters/smoke --max_steps 2  # smoke test
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import torch

# Add repo root for imports if needed
_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

import yaml

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def _load_config(config_path: Optional[str]) -> Dict[str, Any]:
    """Load YAML config; return empty dict if missing."""
    if not config_path or not Path(config_path).exists():
        return {}
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def _get_arg(args: argparse.Namespace, key: str, config: Dict[str, Any], default: Any = None) -> Any:
    """CLI overrides config."""
    val = getattr(args, key, None)
    if val is not None:
        return val
    return config.get(key, default)


def load_dataset_streaming_or_static(
    dataset_path: Optional[str] = None,
    train_file: Optional[str] = None,
    max_length: int = 512,
    max_samples: Optional[int] = None,
):
    """
    Load dataset from parquet, HuggingFace disk, or JSONL.
    Returns DatasetDict with 'train' and 'validation'; dataset must have 'text' column.
    """
    import datasets
    path = train_file or dataset_path
    if not path:
        raise ValueError("Provide --dataset_path or --train_file")
    path = Path(path)
    if path.suffix == ".jsonl":
        from training.utils import JsonlTextDataset
        ds = JsonlTextDataset(str(path), max_samples=max_samples)
        texts = [s["text"] for s in ds.samples]
        if not texts:
            raise ValueError(f"No samples in {path}")
        hf_ds = datasets.Dataset.from_dict({"text": texts})
        n = len(hf_ds)
        test_size = min(0.1, max(1, n // 10))
        split = hf_ds.train_test_split(test_size=test_size, seed=42)
        return datasets.DatasetDict({"train": split["train"], "validation": split["test"]})
    if path.suffix == ".parquet" or (path.is_dir() and (path / "train.parquet").exists()):
        if path.is_file():
            ds = datasets.Dataset.from_parquet(str(path))
        else:
            ds = datasets.Dataset.from_parquet(str(path / "train.parquet"))
        split = ds.train_test_split(test_size=0.1, seed=42)
        return datasets.DatasetDict({"train": split["train"], "validation": split["test"]})
    # HuggingFace load_from_disk
    return datasets.load_from_disk(str(path))


def collate_fn(tokenizer, max_length: int = 512, pad_to_multiple_of: Optional[int] = None):
    """Data collator: tokenize text, set labels (mask padding with -100). Supports text-only and text+embedding (embedding passed through if present)."""

    def _collate(batch: List[Dict[str, Any]]) -> Dict[str, Any]:
        texts = [b["text"] for b in batch]
        enc = tokenizer(
            texts,
            padding="longest",
            truncation=True,
            max_length=max_length,
            return_tensors="pt",
            pad_to_multiple_of=pad_to_multiple_of,
        )
        labels = enc["input_ids"].clone()
        pad_id = tokenizer.pad_token_id or tokenizer.eos_token_id
        if pad_id is not None:
            labels[labels == pad_id] = -100
        enc["labels"] = labels
        # Pass through precomputed embeddings if present (for future multimodal)
        if "embedding" in batch[0]:
            enc["embedding"] = torch.stack([b["embedding"] for b in batch])
        return enc

    return _collate


def main() -> None:
    parser = argparse.ArgumentParser(description="MedGemma LoRA fine-tuning (model-dev)")
    parser.add_argument("--config", default=None, help="Path to finetune_config.yaml")
    parser.add_argument("--dataset_provenance_id", default=None, help="Required unless --allow-local-dev")
    parser.add_argument("--allow_local_dev", "--allow-local-dev", action="store_true", dest="allow_local_dev", help="Allow run without provenance for local/smoke tests")
    parser.add_argument("--base_model_id", default=None)
    parser.add_argument("--adapter_output_dir", default=None)
    parser.add_argument("--dataset_path", default=None)
    parser.add_argument("--train_file", default=None)
    parser.add_argument("--per_device_train_batch_size", type=int, default=None)
    parser.add_argument("--learning_rate", type=float, default=None)
    parser.add_argument("--num_train_epochs", type=int, default=None)
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--save_steps", type=int, default=None)
    parser.add_argument("--eval_steps", type=int, default=None)
    parser.add_argument("--max_steps", type=int, default=-1)
    parser.add_argument("--max_length", type=int, default=None)
    parser.add_argument("--use_8bit", action="store_true", help="Use 8-bit via bitsandbytes")
    parser.add_argument("--max_samples", type=int, default=None, help="Cap samples for smoke test")
    parser.add_argument("--save_to_hf", action="store_true", help="Push adapter to HF (requires HF_TOKEN)")
    parser.add_argument("--hf_repo_id", default=None)
    args = parser.parse_args()

    config = _load_config(args.config)
    base_model_id = _get_arg(args, "base_model_id", config, "google/medgemma-2b-it")
    adapter_output_dir = _get_arg(args, "adapter_output_dir", config, "model-dev/adapters/default")
    per_device_train_batch_size = _get_arg(args, "per_device_train_batch_size", config, 4)
    learning_rate = _get_arg(args, "learning_rate", config, 5e-5)
    num_train_epochs = _get_arg(args, "num_train_epochs", config, 3)
    seed = _get_arg(args, "seed", config, 42)
    save_steps = _get_arg(args, "save_steps", config, 500)
    eval_steps = _get_arg(args, "eval_steps", config, 250)
    max_length = _get_arg(args, "max_length", config, 512)

    if not args.dataset_provenance_id and not args.allow_local_dev:
        logger.error("Missing --dataset_provenance_id. Set it or use --allow-local-dev for local/smoke tests.")
        sys.exit(1)

    provenance_id = args.dataset_provenance_id or "local-dev"

    import torch
    import uuid
    from transformers import AutoModelForCausalLM, AutoTokenizer, Trainer, TrainingArguments
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

    run_id = str(uuid.uuid4())[:8]

    tokenizer = AutoTokenizer.from_pretrained(base_model_id, trust_remote_code=True)
    load_kwargs = dict(
        trust_remote_code=True,
        device_map="auto",
    )
    if _get_arg(args, "use_8bit", config, False) or config.get("use_8bit"):
        try:
            from transformers import BitsAndBytesConfig
            load_kwargs["quantization_config"] = BitsAndBytesConfig(
                load_in_8bit=True,
                llm_int8_enable_fp32_cpu_offload=False,
            )
        except Exception as e:
            logger.warning("8-bit load failed, continuing in fp16/bf16: %s", e)
    model = AutoModelForCausalLM.from_pretrained(base_model_id, **load_kwargs)
    if getattr(model, "is_loaded_in_8bit", False) or getattr(model, "is_loaded_in_4bit", False):
        model = prepare_model_for_kbit_training(model)
    lora_config = LoraConfig(
        r=_get_arg(args, "lora_r", config, 16),
        lora_alpha=config.get("lora_alpha", 16),
        lora_dropout=config.get("lora_dropout", 0.05),
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=config.get("target_modules", ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]),
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    try:
        ds = load_dataset_streaming_or_static(
            dataset_path=args.dataset_path,
            train_file=args.train_file,
            max_length=max_length,
            max_samples=args.max_samples,
        )
    except Exception as e:
        logger.error("Dataset load failed: %s", e)
        sys.exit(1)

    if "text" not in ds["train"].column_names:
        logger.error("Dataset must have 'text' column.")
        sys.exit(1)

    train_count = len(ds["train"])
    val_count = len(ds["validation"])
    if train_count == 0:
        logger.error("No training samples.")
        sys.exit(1)

    # Provenance
    training_utils = _get_training_utils()
    training_utils.record_provenance(
        run_id=run_id,
        dataset_provenance_id=provenance_id,
        dataset_id=provenance_id,
        train_count=train_count,
        val_count=val_count,
        split_seed=seed,
        adapter_output_dir=adapter_output_dir,
        base_model_id=base_model_id,
        extra={"preprocessing_steps": ["tokenization", "train/val split"]},
    )

    training_args = TrainingArguments(
        output_dir=str(Path(adapter_output_dir) / "checkpoints"),
        per_device_train_batch_size=per_device_train_batch_size,
        gradient_accumulation_steps=config.get("gradient_accumulation_steps", 4),
        learning_rate=learning_rate,
        weight_decay=config.get("weight_decay", 0.01),
        num_train_epochs=num_train_epochs,
        max_steps=args.max_steps if args.max_steps > 0 else -1,
        lr_scheduler_type=config.get("lr_scheduler_type", "cosine"),
        warmup_ratio=config.get("warmup_ratio", 0.03),
        bf16=config.get("bf16", True),
        fp16=config.get("fp16", False),
        logging_steps=config.get("logging_steps", 20),
        save_steps=save_steps,
        eval_steps=eval_steps,
        save_total_limit=3,
        seed=seed,
        load_best_model_at_end=True,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=ds["train"],
        eval_dataset=ds["validation"],
        data_collator=collate_fn(tokenizer, max_length=max_length),
    )
    trainer.train()
    Path(adapter_output_dir).mkdir(parents=True, exist_ok=True)
    model.save_pretrained(adapter_output_dir)
    tokenizer.save_pretrained(adapter_output_dir)

    training_utils.generate_model_card(
        adapter_output_dir,
        model_name=Path(adapter_output_dir).name,
        dataset_id=provenance_id,
        dataset_provenance_id=provenance_id,
        base_model_id=base_model_id,
        hyperparams={"learning_rate": learning_rate, "num_train_epochs": num_train_epochs, "per_device_train_batch_size": per_device_train_batch_size},
        train_count=train_count,
        val_count=val_count,
    )
    if args.save_to_hf:
        training_utils.checkpoint_and_push(adapter_output_dir, repo_id=args.hf_repo_id, save_to_hf=True)
    logger.info("Adapter saved to %s", adapter_output_dir)


def _get_training_utils():
    """Import training_utils from model-dev.training (same package)."""
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "training_utils",
        Path(__file__).parent / "training_utils.py",
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


if __name__ == "__main__":
    main()
