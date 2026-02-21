"""
Training utilities for model-dev: provenance, model cards, checkpoint push.

Purpose: Auditable training runs; persist provenance JSON; generate adapter cards;
optional push to Hugging Face Hub.
Inputs: Run config, dataset stats, adapter path. Outputs: provenance JSON, adapter_card.md.

Usage:
  from model_dev.training.training_utils import record_provenance, generate_model_card, checkpoint_and_push
  record_provenance(run_id=..., dataset_provenance_id=..., train_count=..., val_count=..., ...)
  generate_model_card(adapter_dir=..., dataset_id=..., metrics=...)
  checkpoint_and_push(adapter_dir, repo_id=..., save_to_hf=True)  # HF_TOKEN in env
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Default artifacts root (relative to repo or cwd)
ARTIFACTS_ROOT = Path(__file__).resolve().parents[2] / "artifacts"
PROVENANCE_DIR = ARTIFACTS_ROOT / "provenance"


def record_provenance(
    run_id: str,
    dataset_provenance_id: str,
    dataset_id: Optional[str] = None,
    dataset_version: Optional[str] = None,
    preprocessing_steps: Optional[List[str]] = None,
    train_count: int = 0,
    val_count: int = 0,
    split_seed: Optional[int] = None,
    adapter_output_dir: Optional[str] = None,
    base_model_id: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Path:
    """
    Persist a provenance JSON summary for this training run.
    Writes to model_dev/artifacts/provenance/{run_id}.json.
    """
    PROVENANCE_DIR.mkdir(parents=True, exist_ok=True)
    out_path = PROVENANCE_DIR / f"{run_id}.json"
    payload = {
        "run_id": run_id,
        "dataset_provenance_id": dataset_provenance_id,
        "dataset_id": dataset_id,
        "dataset_version": dataset_version,
        "preprocessing_steps": preprocessing_steps or [],
        "train_count": train_count,
        "val_count": val_count,
        "split_seed": split_seed,
        "adapter_output_dir": adapter_output_dir,
        "base_model_id": base_model_id,
        **(extra or {}),
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    logger.info("Provenance written to %s", out_path)
    return out_path


def generate_model_card(
    adapter_dir: str | Path,
    *,
    model_name: str = "MedGemma-LoRA-Adapter",
    dataset_id: Optional[str] = None,
    dataset_provenance_id: Optional[str] = None,
    base_model_id: Optional[str] = None,
    hyperparams: Optional[Dict[str, Any]] = None,
    train_count: Optional[int] = None,
    val_count: Optional[int] = None,
    eval_summary: Optional[Dict[str, Any]] = None,
    intended_use: str = "Clinical decision support (CDS) only; clinician review required.",
    limitations: str = "Not a diagnostic system. Output must be reviewed by a licensed clinician.",
) -> Path:
    """
    Auto-generate adapter_card.md under the adapter folder with required fields.
    Call after training to populate from run metadata.
    """
    adapter_path = Path(adapter_dir)
    adapter_path.mkdir(parents=True, exist_ok=True)
    card_path = adapter_path / "adapter_card.md"

    body = f"""# {model_name}

## Metadata
- **Adapter path:** `{adapter_path}`
- **Base model:** {base_model_id or 'N/A'}
- **Dataset ID:** {dataset_id or 'N/A'}
- **Provenance ID:** {dataset_provenance_id or 'N/A'}

## Training
- **Train samples:** {train_count or 'N/A'}
- **Validation samples:** {val_count or 'N/A'}
- **Hyperparameters:** {json.dumps(hyperparams or {}, indent=2)}

## Evaluation summary
```json
{json.dumps(eval_summary or {}, indent=2)}
```

## Intended use
{intended_use}

## Limitations
{limitations}

## Contact
See repo README for issues and governance.
"""
    card_path.write_text(body, encoding="utf-8")
    logger.info("Model card written to %s", card_path)
    return card_path


def checkpoint_and_push(
    adapter_dir: str | Path,
    repo_id: Optional[str] = None,
    save_to_hf: bool = False,
    token: Optional[str] = None,
) -> bool:
    """
    Optionally push adapter to Hugging Face Hub.
    Only pushes if save_to_hf=True and HF_TOKEN (or token) is set.
    """
    if not save_to_hf:
        return False
    tok = token or os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    if not tok:
        logger.warning("Push skipped: no HF token (set HF_TOKEN or pass token=)")
        return False
    try:
        from huggingface_hub import HfApi
        api = HfApi(token=tok)
        path = Path(adapter_dir)
        if not path.is_dir():
            logger.warning("Adapter dir not found: %s", adapter_dir)
            return False
        rid = repo_id or path.name
        api.upload_folder(
            folder_path=str(path),
            repo_id=rid,
            repo_type="model",
            token=tok,
        )
        logger.info("Pushed adapter to Hugging Face: %s", rid)
        return True
    except Exception as e:
        logger.exception("Failed to push to HF: %s", e)
        return False
