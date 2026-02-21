#!/usr/bin/env python3
"""
radiology_merge.py — Merge radiology LoRA adapter into base MedGemma-4B for production.

Produces a single deployable model (~2.85GB) for Bone Age / ROP / Fracture inference.

Usage (from repo root):
  python model-dev/deploy/radiology_merge.py --adapter_path ./models/medgemma-4b-radiology/lora --output_path ./models/medgemma-4b-radiology-prod
  python model-dev/deploy/radiology_merge.py --adapter_path ./models/medgemma-4b-radiology/lora --output_path ./models/medgemma-4b-radiology-prod --base_model_id google/medgemma-4b-it
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

import torch


def merge_radiology_model(
    base_model_id: str = "google/medgemma-4b-it",
    adapter_path: str | Path = "./models/medgemma-4b-radiology-lora",
    output_path: str | Path = "./models/medgemma-4b-radiology-prod",
    trust_remote_code: bool = True,
) -> None:
    """Load base MedGemma-4B, attach radiology LoRA, merge and save production model + processor."""
    from peft import PeftModel

    adapter_path = Path(adapter_path)
    output_path = Path(output_path)
    output_path.mkdir(parents=True, exist_ok=True)

    # Prefer vision-language model class for MedGemma-4B
    try:
        from transformers import AutoModelForImageTextToText, AutoProcessor
        model_class = AutoModelForImageTextToText
    except ImportError:
        from transformers import AutoModelForCausalLM, AutoProcessor
        model_class = AutoModelForCausalLM

    print("Loading base model:", base_model_id)
    processor = AutoProcessor.from_pretrained(base_model_id, trust_remote_code=trust_remote_code)
    base = model_class.from_pretrained(
        base_model_id,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        device_map="auto",
        trust_remote_code=trust_remote_code,
    )

    print("Loading radiology adapter:", adapter_path)
    radiology_model = PeftModel.from_pretrained(base, str(adapter_path))
    merged = radiology_model.merge_and_unload()

    print("Saving production model to:", output_path)
    merged.save_pretrained(str(output_path))
    processor.save_pretrained(str(output_path))

    manifest = {
        "base_model_id": base_model_id,
        "adapter_path": str(adapter_path),
        "output_path": str(output_path),
        "merged": True,
    }
    with open(output_path / "radiology_deploy_manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)

    print("Radiology specialist model ready.")
    print("  Bone Age MAE target: ±2.8mo | ROP AUC target: 0.94 | Fracture F1 target: 0.92")


def main():
    p = argparse.ArgumentParser(description="Merge MedGemma-4B radiology LoRA → production model")
    p.add_argument("--adapter_path", type=str, default="./models/medgemma-4b-radiology/lora", help="Path to trained LoRA adapter")
    p.add_argument("--output_path", type=str, default="./models/medgemma-4b-radiology-prod", help="Output dir for merged model")
    p.add_argument("--base_model_id", type=str, default="google/medgemma-4b-it")
    p.add_argument("--no_trust_remote_code", action="store_true", help="Disable trust_remote_code")
    args = p.parse_args()

    merge_radiology_model(
        base_model_id=args.base_model_id,
        adapter_path=args.adapter_path,
        output_path=args.output_path,
        trust_remote_code=not args.no_trust_remote_code,
    )


if __name__ == "__main__":
    main()
