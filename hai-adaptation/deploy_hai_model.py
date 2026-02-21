"""
HAI-DEF production merge: merge LoRA adapter into base (optional) and export for deployment.

Usage:
  python -m hai_adaptation.deploy_hai_model --adapter_path ./models/hai-pedifine-v1.0 --output_path ./models/hai-pedifine-merged
  python hai-adaptation/deploy_hai_model.py --adapter_path ./models/hai-pedifine-v1.0

When output_path is set, merges adapter with base and saves a single model for inference.
Otherwise only copies adapter + tokenizer to a deployment-ready layout.
"""

from __future__ import annotations

import argparse
import json
import logging
import shutil
import sys
from pathlib import Path

_HAI_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _HAI_DIR.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

logging.basicConfig(format="%(levelname)s: %(message)s", level=logging.INFO)
logger = logging.getLogger("hai_deploy")


def merge_and_save(
    base_model_id: str,
    adapter_path: Path,
    output_path: Path,
    trust_remote_code: bool = True,
) -> None:
    """Merge PEFT adapter with base model and save full model."""
    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from peft import PeftModel
    except ImportError as e:
        raise ImportError("Need transformers and peft") from e

    logger.info("Loading base model: %s", base_model_id)
    tokenizer = AutoTokenizer.from_pretrained(base_model_id, trust_remote_code=trust_remote_code)
    model = AutoModelForCausalLM.from_pretrained(
        base_model_id,
        trust_remote_code=trust_remote_code,
    )
    model = PeftModel.from_pretrained(model, str(adapter_path))
    model = model.merge_and_unload()
    output_path = Path(output_path)
    output_path.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(output_path))
    tokenizer.save_pretrained(str(output_path))
    logger.info("Merged model saved to %s", output_path)


def copy_deployment_artifacts(adapter_path: Path, output_path: Path) -> None:
    """Copy adapter + tokenizer to output dir for adapter-only deployment."""
    adapter_path = Path(adapter_path)
    output_path = Path(output_path)
    output_path.mkdir(parents=True, exist_ok=True)
    for name in ["adapter_config.json", "adapter_model.safetensors", "adapter_model.bin"]:
        src = adapter_path / name
        if src.exists():
            shutil.copy2(src, output_path / name)
    tok_config = adapter_path / "tokenizer_config.json"
    if tok_config.exists():
        for f in adapter_path.glob("tokenizer*"):
            shutil.copy2(f, output_path / f.name)
    if (adapter_path / "provenance.json").exists():
        shutil.copy2(adapter_path / "provenance.json", output_path / "provenance.json")
    logger.info("Deployment artifacts copied to %s", output_path)


def main() -> None:
    p = argparse.ArgumentParser(description="HAI-DEF production merge / deploy")
    p.add_argument("--adapter_path", type=str, required=True, help="Path to trained adapter (hai-pedifine-v1.0)")
    p.add_argument("--output_path", type=str, default=None, help="Output dir; if set and merge requested, save merged model")
    p.add_argument("--base_model_id", type=str, default="google/medgemma-4b-it")
    p.add_argument("--merge", action="store_true", help="Merge adapter into base and save full model")
    p.add_argument("--no_merge", action="store_true", help="Only copy adapter artifacts (default)")
    args = p.parse_args()

    adapter_path = Path(args.adapter_path)
    if not adapter_path.is_dir():
        logger.error("Adapter path not found: %s", adapter_path)
        sys.exit(1)

    output_path = Path(args.output_path) if args.output_path else (adapter_path / "deploy")
    if args.merge:
        merge_and_save(args.base_model_id, adapter_path, output_path)
    else:
        copy_deployment_artifacts(adapter_path, output_path)

    # Write deploy manifest
    manifest = {
        "adapter_path": str(adapter_path),
        "output_path": str(output_path),
        "merged": args.merge,
        "base_model_id": args.base_model_id,
    }
    with open(Path(output_path) / "deploy_manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    print("HAI-DEF deployment ready at", output_path)


if __name__ == "__main__":
    main()
