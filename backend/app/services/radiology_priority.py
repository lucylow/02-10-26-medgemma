# backend/app/services/radiology_priority.py
"""
Priority classification for radiology triage.
Conservative thresholds — AI suggests urgency, never diagnoses.
Priority labels: stat | urgent | routine
"""


def classify_priority(risk_score: float, modality: str) -> str:
    """
    Map risk_score (0–1) to non-diagnostic priority label.
    Conservative thresholds to avoid over-triage.
    """
    if risk_score >= 0.85:
        return "stat"
    if risk_score >= 0.60:
        return "urgent"
    return "routine"
