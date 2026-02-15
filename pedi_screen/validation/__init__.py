"""
Validation — automated evaluation pipelines.

Legacy: run_validation_suite (benchmark.json, bias_audit.json)
Full eval: run_full_evaluation (benchmark + bias + JSON + safety + eval table)
"""
from .suite import run_validation_suite
from .eval_runner import run_full_evaluation
from .synthetic_eval_generator import generate_synthetic_eval_data

__all__ = [
    "run_validation_suite",
    "run_full_evaluation",
    "generate_synthetic_eval_data",
]
