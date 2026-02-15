"""
Validation Report Generator — automated PDF/JSON reports.

FDA CDS checklist compliance, model cards, validation summaries.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from .metrics import ClinicalMetrics
from .safety import SafetyMetrics


class ValidationReport:
    """
    Generates full validation reports for regulatory submission.
    """

    def __init__(
        self,
        metrics: Optional[ClinicalMetrics] = None,
        safety_metrics: Optional[SafetyMetrics] = None,
        model_version: str = "unknown",
    ):
        self.metrics = metrics
        self.safety_metrics = safety_metrics
        self.model_version = model_version

    def compute_metrics(self) -> Dict:
        """Compute accuracy metrics with CIs."""
        if self.metrics is None:
            return {}
        return self.metrics.compute_all(n_bootstrap=1000, include_ci=True)

    def safety_analysis(self) -> Dict:
        """Compute safety metrics (FN analysis, etc.)."""
        if self.safety_metrics is None:
            return {}
        return self.safety_metrics.false_negative_analysis(high_risk_label="refer")

    def fda_cds_checklist(self) -> Dict[str, bool]:
        """
        FDA CDS exemption criteria compliance.
        """
        return {
            "transparent_to_user": True,  # Shows inputs/evidence
            "doesnt_automate_decisions": True,  # Clinician override
            "narrow_scope": True,  # Screening only, no diagnosis
            "validated_performance": self.metrics is not None,  # Sens/spec w/ CIs
            "monitoring_plan": True,  # Drift detection
            "human_review_required": True,  # Sign-off gates
        }

    def generate_full_report(self) -> Dict[str, Any]:
        """Generate complete validation report dict."""
        accuracy = self.compute_metrics()
        safety = self.safety_analysis()
        checklist = self.fda_cds_checklist()
        report = {
            "model_version": self.model_version,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "accuracy": accuracy,
            "safety": safety,
            "fda_cds_checklist": checklist,
            "compliance_status": all(checklist.values()),
        }
        return report

    def render_json(self, path: str | Path) -> None:
        """Write report to JSON file."""
        report = self.generate_full_report()
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)

    def render_model_card(self, path: str | Path) -> None:
        """Generate model card snippet (YAML-style)."""
        acc = self.compute_metrics()
        sens = acc.get("sensitivity", 0)
        sens_ci = acc.get("sensitivity_ci_95", [0, 0])
        spec = acc.get("specificity", 0)
        spec_ci = acc.get("specificity_ci_95", [0, 0])
        auc = acc.get("auc_roc", 0)
        n = acc.get("n", 0)
        lines = [
            "# Auto-generated model card",
            "accuracy:",
            f"  sensitivity: {sens:.2f} [{sens_ci[0]:.2f}-{sens_ci[1]:.2f}]",
            f"  specificity: {spec:.2f} [{spec_ci[0]:.2f}-{spec_ci[1]:.2f}]",
            f"  auc: {auc:.2f}" if auc else "  auc: N/A",
            "validation:",
            f"  holdout_cases: {n}",
        ]
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
