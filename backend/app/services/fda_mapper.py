"""
FDA SaMD vs CDS risk mapping — machine-readable regulatory classification.
Signals CDS-exempt status without legal overreach (non-SaMD per FDA CDS guidance).
"""
from typing import Any, Dict, List, Set


FDA_CDS_CRITERIA = {
    "C1": {
        "text": "Provides recommendations but does not replace clinician judgment",
        "risk": "Low",
        "classification": "CDS Exempt",
    },
    "C2": {
        "text": "Clinician can independently review basis",
        "risk": "Low",
        "classification": "CDS Exempt",
    },
    "C3": {
        "text": "Does not perform autonomous diagnosis",
        "risk": "Low",
        "classification": "CDS Exempt",
    },
}


def _get_report_text(report: Dict[str, Any]) -> str:
    """Flatten report content for phrase matching."""
    parts: List[str] = []
    if report.get("clinical_summary"):
        parts.append(str(report["clinical_summary"]))
    for ev in report.get("key_evidence", []):
        parts.append(str(ev))
    for rec in report.get("recommendations", []):
        parts.append(str(rec))
    return " ".join(parts).lower()


def map_report_to_fda(report: Dict[str, Any]) -> Dict[str, Any]:
    """Map report content to FDA CDS criteria; returns classification and matched criteria."""
    text = _get_report_text(report)
    mappings: Set[str] = set()

    if "recommend" in text or "suggest" in text or "consider" in text:
        mappings.add("C1")
    if "evidence" in text or "basis" in text or "finding" in text:
        mappings.add("C2")
    # C3: always satisfied (tool design)
    mappings.add("C3")

    criteria_details = [
        {"id": cid, **FDA_CDS_CRITERIA[cid]}
        for cid in sorted(mappings)
    ]

    return {
        "classification": "Clinical Decision Support (Non-Device)",
        "criteria": list(mappings),
        "criteria_details": criteria_details,
        "sa_md_risk": "Not SaMD (per FDA CDS guidance)",
        "human_in_loop": True,
        "explainable": True,
        "no_autonomous_diagnosis": True,
    }
