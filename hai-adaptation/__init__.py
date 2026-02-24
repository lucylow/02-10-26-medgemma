"""
HAI-DEF 7-task pediatric adaptation pipeline for MedGemma-4B-IT.
Tasks: ASQ-3, ROP, Bone Age, Growth Z-Score, Fractures, CHW Workflow, Multilingual Reports.
"""

from .task_datasets import (
    ASQ3Scorer,
    ROPDetector,
    BoneAgeAssessor,
    GrowthZScoreDataset,
    FractureDataset,
    CHWWorkflowDataset,
    MultilingualReportDataset,
)
from .hai_validator import HAIValidator, HAIValidationMetrics

__all__ = [
    "ASQ3Scorer",
    "ROPDetector",
    "BoneAgeAssessor",
    "GrowthZScoreDataset",
    "FractureDataset",
    "CHWWorkflowDataset",
    "MultilingualReportDataset",
    "HAIValidator",
    "HAIValidationMetrics",
]
