"""
Inference with MedGemma-4B + QLoRA adapter.

Load base model in 4-bit, mount trained adapter, run generation.

Usage:
  python training/inference_qlora.py --adapter outputs/medgemma-4b-peds-qlora-adapter
"""
from __future__ import annotations

import argparse

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

try:
    from config.settings import settings
    BASE_MODEL = getattr(settings, "MEDGEMMA_MODEL_PATH", "google/medgemma-4b-it")
except ImportError:
    BASE_MODEL = "google/medgemma-4b-it"

BITSANBYTES_CONFIG = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--adapter", default="outputs/medgemma-4b-peds-qlora-adapter")
    parser.add_argument("--prompt", default="Age: 24 months\nDomain: communication\nCaregiver observation: Child says a few words.\n\nProvide structured JSON output only.")
    args = parser.parse_args()

    tokenizer = AutoTokenizer.from_pretrained(args.adapter, trust_remote_code=True)
    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        quantization_config=BITSANBYTES_CONFIG,
        device_map="auto",
        trust_remote_code=True,
    )
    model = PeftModel.from_pretrained(base_model, args.adapter)
    model.eval()

    messages = [
        {"role": "system", "content": "You are a medical assistant providing pediatric developmental SCREENING support only. NEVER diagnose."},
        {"role": "user", "content": args.prompt},
    ]
    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    with torch.no_grad():
        out = model.generate(
            **inputs,
            max_new_tokens=256,
            do_sample=False,
            pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id,
        )

    response = tokenizer.decode(out[0][inputs["input_ids"].shape[1] :], skip_special_tokens=True)
    print(response)


if __name__ == "__main__":
    main()
