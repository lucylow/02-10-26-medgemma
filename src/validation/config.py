"""
Validation config loader — PediScreen targets and thresholds.

Loads configs/validation_config.yaml for validation gates and reporting.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

# Default config path (relative to project root)
DEFAULT_CONFIG_PATH = Path(__file__).resolve().parents[2] / "configs" / "validation_config.yaml"

# Fallback defaults if config file missing
DEFAULT_TARGETS = {
    "accuracy": {
        "sensitivity": {"target": 0.96, "min_gate": 0.93},
        "specificity": {"target": 0.82, "min_gate": 0.78},
        "ppv": {"target": 0.65, "min_gate": 0.55},
        "npv": {"target": 0.98, "min_gate": 0.97},
        "auc_roc": {"target": 0.87, "min_gate": 0.84},
    },
    "safety": {
        "false_negative_rate_max": 0.02,
        "high_risk_fn_count_max": 0,
        "safety_agent_recall_min": 1.0,
    },
    "clinician_agreement": {"cohen_kappa_min": 0.70, "target": 0.78},
}


def load_validation_config(config_path: Optional[Path] = None) -> Dict[str, Any]:
    """Load validation config from YAML or return defaults."""
    path = config_path or DEFAULT_CONFIG_PATH
    if not path.exists():
        return DEFAULT_TARGETS.copy()

    try:
        import yaml
        with open(path, encoding="utf-8") as f:
            return yaml.safe_load(f) or DEFAULT_TARGETS.copy()
    except Exception:
        return DEFAULT_TARGETS.copy()


def get_validation_targets(config_path: Optional[Path] = None) -> Dict[str, Any]:
    """Get validation gate thresholds for pass/fail checks."""
    cfg = load_validation_config(config_path)
    return {
        "sensitivity_min": cfg.get("accuracy", {}).get("sensitivity", {}).get("min_gate", 0.93),
        "specificity_min": cfg.get("accuracy", {}).get("specificity", {}).get("min_gate", 0.78),
        "npv_min": cfg.get("accuracy", {}).get("npv", {}).get("min_gate", 0.97),
        "auc_roc_min": cfg.get("accuracy", {}).get("auc_roc", {}).get("min_gate", 0.84),
        "fnr_max": cfg.get("safety", {}).get("false_negative_rate_max", 0.02),
        "high_risk_fn_max": cfg.get("safety", {}).get("high_risk_fn_count_max", 0),
        "safety_recall_min": cfg.get("safety", {}).get("safety_agent_recall_min", 1.0),
        "cohen_kappa_min": cfg.get("clinician_agreement", {}).get("cohen_kappa_min", 0.70),
    }
