"""
Merge PEFT adapter with base MedGemma, export to assets/models/hai-pedifine/, optional HF upload.
Run from repo root: python hai-adaptation/deploy_hai_model.py --peft-path models/hai-pedifine-v1.0
"""
from __future__ import annotations

import argparse
import shutil
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="HAI-DEF production merge and export")
    parser.add_argument("--peft-path", default="models/hai-pedifine-v1.0", help="PEFT adapter directory")
    parser.add_argument("--base-model", default="google/medgemma-4b-it")
    parser.add_argument("--export-dir", default="assets/models/hai-pedifine", help="Final export path")
    parser.add_argument("--merge", action="store_true", help="Merge LoRA into base and save full model")
    args = parser.parse_args()

    peft_path = Path(args.peft_path)
    export_dir = Path(args.export_dir)

    if not peft_path.exists():
        print(f"PEFT path not found: {peft_path}. Run train_hai_tasks.py first.")
        return

    export_dir.mkdir(parents=True, exist_ok=True)

    if args.merge:
        from peft import PeftModel
        from transformers import AutoModelForCausalLM, AutoTokenizer

        print("Loading base model and adapter...")
        tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True)
        model = AutoModelForCausalLM.from_pretrained(
            args.base_model,
            device_map="auto",
            trust_remote_code=True,
        )
        model = PeftModel.from_pretrained(model, str(peft_path))
        model = model.merge_and_unload()
        model.save_pretrained(export_dir)
        tokenizer.save_pretrained(export_dir)
        print(f"Merged model saved to {export_dir}")
    else:
        # Copy adapter + tokenizer only (inference with base + adapter)
        for name in ["adapter_config.json", "adapter_model.safetensors", "adapter_model.bin"]:
            src = peft_path / name
            if src.exists():
                shutil.copy2(src, export_dir / name)
        for name in ["tokenizer_config.json", "tokenizer.json", "special_tokens_map.json"]:
            src = peft_path / name
            if src.exists():
                shutil.copy2(src, export_dir / name)
        config_src = peft_path / "config.json"
        if config_src.exists():
            shutil.copy2(config_src, export_dir / "config.json")
        report_src = peft_path / "hai_def_report.json"
        if report_src.exists():
            shutil.copy2(report_src, export_dir / "hai_def_report.json")
        print(f"Adapter and tokenizer copied to {export_dir}")
        print("Set base_model in config to load with base + this adapter at inference.")

    with open(export_dir / "README.txt", "w", encoding="utf-8") as f:
        f.write(f"HAI-DEF 7-task PediScreen adapter.\nBase: {args.base_model}\nPEFT: {peft_path}\n")


if __name__ == "__main__":
    main()
