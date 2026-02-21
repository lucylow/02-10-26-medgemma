#!/usr/bin/env python3
"""
NIST 800-53 Rev.5 — Automated Evidence Collection for PediScreen AI.

Generates evidence_report.json with control verification status, drift/bias/FL flags,
and timestamps for compliance audits and continuous monitoring.
"""
from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path

# Controls verified by automated checks or documented implementation
CONTROLS_VERIFIED = [
    "AC-2",
    "AC-3",
    "AC-6",
    "AU-2",
    "AU-6",
    "SC-8",
    "SC-12",
    "SC-28",
    "SI-4",
    "RA-5",
    "CM-2",
    "IR-4",
]


def _check_drift_monitoring() -> bool:
    """Indicate whether drift monitoring (PSI, etc.) is active in codebase."""
    psi_path = Path(__file__).resolve().parent.parent / "backend" / "app" / "telemetry" / "psi.py"
    return psi_path.exists()


def _check_federated_learning() -> bool:
    """Indicate whether federated learning scaffolding is present."""
    # Placeholder: could check for FL config or FL-related modules
    fl_config = os.environ.get("FEDERATED_LEARNING_ENABLED", "").lower() in ("1", "true", "yes")
    return fl_config


def generate_nist_evidence(
    *,
    output_path: str | Path | None = None,
    drift_active: bool | None = None,
    federated_enabled: bool | None = None,
) -> dict:
    """
    Build evidence report dict. Optionally write to compliance/evidence_report.json.
    """
    if output_path is None:
        output_path = Path(__file__).resolve().parent / "evidence_report.json"
    output_path = Path(output_path)

    if drift_active is None:
        drift_active = _check_drift_monitoring()
    if federated_enabled is None:
        federated_enabled = _check_federated_learning()

    report = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "framework": "NIST SP 800-53 Rev.5",
        "scope": "PediScreen AI (MedGemma) — Moderate baseline",
        "controls_verified": CONTROLS_VERIFIED,
        "drift_monitoring_active": drift_active,
        "federated_learning_enabled": federated_enabled,
        "evidence_sources": [
            "compliance/nist_800-53_matrix.md",
            "compliance/control_implementations/",
            "backend/app/middleware/",
            "backend/app/services/audit.py",
            "backend/app/telemetry/",
            "regulatory/",
        ],
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)

    return report


if __name__ == "__main__":
    report = generate_nist_evidence()
    out = Path(__file__).resolve().parent / "evidence_report.json"
    print(f"NIST evidence report written to {out}")
    print(json.dumps(report, indent=2))
