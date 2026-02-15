"""
PediScreen AI - Pediatric Data Quality Validator

Validates synthetic screening data for realism and clinical alignment.
"""
from __future__ import annotations

from typing import Any, List

import numpy as np


class PediatricDataValidator:
    """Validate synthetic pediatric screening records."""

    RISK_MAP = {"on_track": 0, "monitor": 1, "discuss": 2, "refer": 3}
    VALID_DOMAINS = {
        "communication",
        "gross_motor",
        "fine_motor",
        "social",
        "cognitive",
    }
    VALID_AGES = {18, 24, 36, 48, 60}

    def _perplexity(self, text: str) -> float:
        """Simple proxy for text naturalness (word diversity).
        Lower = more natural. Realistic text typically < 20."""
        words = text.lower().split()
        if len(words) < 2:
            return 0.0
        unique = len(set(words))
        return unique / len(words) * 100  # rough proxy

    def _valid_age_domain(self, age_months: int, domain: str) -> bool:
        """Check age-domain alignment."""
        return (
            age_months in self.VALID_AGES
            and domain in self.VALID_DOMAINS
        )

    def validate_realism(
        self, records: List[Any]
    ) -> dict[str, Any]:
        """Validate records for realism and balance."""
        issues: List[str] = []

        for r in records:
            rec_id = getattr(r, "record_id", str(r))
            text = getattr(r, "caregiver_text", "")
            age = getattr(r, "age_months", 0)
            domain = getattr(r, "domain", "")

            if self._perplexity(text) > 20:
                issues.append(f"Unnatural text: {rec_id}")

            if not self._valid_age_domain(age, domain):
                issues.append(f"Age-domain mismatch: {rec_id}")

        # Risk distribution balance
        risk_counts = [0, 0, 0, 0]
        for r in records:
            risk = getattr(r, "clinician_risk", "on_track")
            idx = self.RISK_MAP.get(risk, 0)
            risk_counts[idx] += 1

        total = len(records)
        if total > 0 and max(risk_counts) > 0.45 * total:
            issues.append("Risk imbalance")

        return {"valid": len(issues) == 0, "issues": issues}
