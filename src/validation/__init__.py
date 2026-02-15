"""
PediScreen AI — Clinical Validation Framework

Production-grade validation for regulatory approval and clinician trust.
Every claim backed by metrics. Every metric has confidence intervals.
"""
from .config import get_validation_targets, load_validation_config
from .metrics import ClinicalMetrics
from .safety import SafetyMetrics, SafetyValidator
from .drift import DriftDetector
from .reporting import ValidationReport

__all__ = [
    "ClinicalMetrics",
    "SafetyMetrics",
    "SafetyValidator",
    "DriftDetector",
    "ValidationReport",
    "get_validation_targets",
    "load_validation_config",
]
