#!/usr/bin/env python
"""
Load MedGemma base model + optional LoRA adapter and run sample inference.
Usage: python scripts/load_and_infer.py [--adapter PATH]
Env: MEDGEMMA_BASE, ADAPTER_PATH
"""
import argparse
import base64
import json
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE = os.environ.get("MEDGEMMA_BASE", "google/medgemma-2b-it")
ADAPTER = os.environ.get("ADAPTER_PATH", "./adapters/pediscreen_lora")


def load_model(adapter_path=None):
    """Load base model and optional LoRA adapter."""
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    adapter = adapter_path or ADAPTER
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[load_and_infer] Loading base: {BASE}, adapter: {adapter}, device: {device}")

    try:
        base = AutoModelForCausalLM.from_pretrained(
            BASE, trust_remote_code=True, device_map="auto"
        )
        tokenizer = AutoTokenizer.from_pretrained(BASE, trust_remote_code=True)

        if os.path.exists(adapter):
            try:
                from peft import PeftModel

                model = PeftModel.from_pretrained(base, adapter)
                print(f"[load_and_infer] LoRA adapter loaded from {adapter}")
            except ImportError:
                print("[load_and_infer] peft not installed, using base model only")
                model = base
        else:
            print(f"[load_and_infer] Adapter not found at {adapter}, using base model only")
            model = base

        model.eval()
        return model, tokenizer
    except Exception as e:
        print(f"[load_and_infer] ERROR: {e}")
        print("Set MEDGEMMA_BASE and ADAPTER_PATH (or --adapter) and ensure models are available.")
        sys.exit(1)


def sample_infer(model, tokenizer, embedding_b64=None):
    """Run sample inference with synthetic or provided embedding."""
    import torch

    prompt = """[METADATA]
age_months: 24
[OBS]
Parent: says ~10 words; no two-word phrases
[IMAGE_EMBEDDING]
<EMBEDDING_PLACEHOLDER>

Task: Provide a short clinical summary, risk level (low/monitor/high), and 2-3 recommendations."""

    # For text-only inference (no embedding injection), use simplified prompt
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    with torch.no_grad():
        out = model.generate(**inputs, max_new_tokens=256)

    text = tokenizer.decode(out[0], skip_special_tokens=True)
    result = {
        "risk": "monitor",
        "summary": text.split("\n")[-1] if "\n" in text else text[:200],
        "full_output": text,
    }
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--adapter", default=None, help="Path to LoRA adapter")
    parser.add_argument("--mock", action="store_true", help="Skip model load, print mock JSON")
    args = parser.parse_args()

    if args.mock:
        result = {
            "risk": "low",
            "summary": "Mock inference (--mock): No model loaded.",
            "full_output": "Use without --mock to run real inference.",
        }
        print(json.dumps(result, indent=2))
        return

    model, tokenizer = load_model(args.adapter)
    result = sample_infer(model, tokenizer)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
