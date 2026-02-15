"""
Validation — automated evaluation pipelines.

Legacy: run_validation_suite (benchmark.json, bias_audit.json)
Clinical: see src.validation for ClinicalMetrics, SafetyMetrics, ValidationReport
"""
from .suite import run_validation_suite

__all__ = ["run_validation_suite"]
