"""
Orchestrator Safety Agent: inspects MedGemma output, enforces safety rules.
Re-exports backend safety_agent when available; standalone implementation otherwise.
"""
import logging
from typing import Any, Dict, List, Tuple

logger = logging.getLogger("orchestrator.safety")


def run_safety_check(
    clinician_summary: str,
    parent_summary: str,
    rationale: List[str],
    risk_level: str,
    confidence: float,
) -> Tuple[bool, str, List[str]]:
    """
    Inspect output for unsafe phrasing. Returns (ok, action, reasons).
    action: ACCEPT | REJECT | ESCALATE | ACCEPT_WITH_NOTE
    """
    try:
        from app.services.safety_agent import apply_safety_to_result, check_safety

        all_text = f"{clinician_summary} {parent_summary} " + " ".join(rationale)
        ok, reasons, _ = check_safety(all_text)
        if ok:
            return True, "ACCEPT", []
        if risk_level == "refer":
            return False, "ESCALATE", reasons
        return False, "ACCEPT_WITH_NOTE", reasons
    except ImportError:
        # Standalone fallback: simple pattern check
        import re
        text = f"{clinician_summary} {parent_summary} " + " ".join(rationale)
        lower = text.lower()
        reasons = []
        if re.search(r"\bdiagnos(e|ed|is)\b", lower):
            reasons.append("Contains diagnosis-like language")
        if re.search(r"\bautism\b|\bADHD\b", lower):
            reasons.append("Contains explicit diagnosis term")
        if re.search(r"\bdefinitely\b|\b100%\s+(sure|certain)\b", lower):
            reasons.append("Contains promise/guarantee language")
        if reasons:
            return False, "ACCEPT_WITH_NOTE", reasons
        return True, "ACCEPT", []
