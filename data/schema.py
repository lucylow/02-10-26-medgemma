"""
PediScreen data schema: Pydantic models for case records and validation.

Use for JSONL/CSV loaders and synthetic data; ensures consistent structure
and Ajv-like validation without PHI in repo.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class CaseRecord(BaseModel):
    """Single screening case record (ground truth + optional metadata)."""

    case_id: str = Field(..., description="Unique case identifier")
    age_months: int = Field(..., ge=0, le=72, description="Age in months")
    observations: str = Field(..., min_length=1, description="Clinical observation text")
    asq_scores: Optional[Dict[str, Any]] = Field(
        None,
        description="ASQ-style structured scores (e.g. vocab, syntax, receptive)",
    )
    image_path: Optional[str] = Field(None, description="Path to image if available")
    label: Optional[str] = Field(
        None,
        description="Ground-truth label: monitor, refer, on_track, discuss",
    )
    consent: Optional[Dict[str, Any]] = Field(
        None,
        description="Consent metadata (e.g. consent_id)",
    )
    # Optional fields from existing test_cases.jsonl
    domain: Optional[str] = None
    structured_scores: Optional[Dict[str, Any]] = None
    image_description: Optional[str] = None
    expected_risk: Optional[str] = None
    expected_rationale: Optional[List[str]] = None
    confidence_threshold: Optional[float] = None
    priority: Optional[str] = None

    def resolved_label(self) -> Optional[str]:
        """Label for evaluation: prefer label, then expected_risk."""
        return self.label or self.expected_risk


# Allowed risk/label values per spec
VALID_LABELS = frozenset({"on_track", "monitor", "discuss", "refer"})


def validate_label(value: Optional[str]) -> bool:
    """Return True if value is a valid risk label."""
    return value is not None and value in VALID_LABELS
