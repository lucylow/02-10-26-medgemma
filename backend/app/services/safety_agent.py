"""
Safety Agent: enforces screening-level language, rejects diagnoses and unsafe phrasing.
Per spec: no explicit diagnoses, no promises/guarantees, only allowed phrasing.
"""
import re
from typing import List, Tuple

# Disallowed: explicit diagnoses
DIAGNOSIS_PATTERNS = [
    r"\bautism\b",
    r"\bADHD\b",
    r"\bASD\b",
    r"\bdefinite\s+delay\b",
    r"\bdiagnos(e|ed|is|ing)\b",
    r"\bidentifies?\s+(autism|ADHD|delay)\b",
    r"\bconfirms?\s+(delay|autism)\b",
]

# Disallowed: promises or guarantees
PROMISE_PATTERNS = [
    r"\bwill\s+(definitely|certainly|surely)\b",
    r"\bdefinitely\b",
    r"\bnormal\b",  # avoid "your child is normal"
    r"\bguarantee(s|d)?\b",
    r"\b100%\s+(sure|certain)\b",
]

# Preferred phrasing (suggest replacements)
SAFE_PHRASES = ["patterns", "suggests", "supports", "may indicate", "consider", "monitoring"]


def check_safety(text: str) -> Tuple[bool, List[str], str]:
    """
    Inspect text for unsafe phrasing.
    Returns (ok, reasons, adjusted_text).
    - ok: False if text should be rejected or softened
    - reasons: list of violation descriptions
    - adjusted_text: safe variant if adjustments made, else original
    """
    if not text or not isinstance(text, str):
        return True, [], text or ""

    reasons: List[str] = []
    lower = text.lower()
    adjusted = text

    # Check for diagnosis-like language
    for pat in DIAGNOSIS_PATTERNS:
        if re.search(pat, lower, re.I):
            reasons.append(f"Contains diagnosis-like language: {pat}")

    # Check for promise/guarantee language
    for pat in PROMISE_PATTERNS:
        if re.search(pat, lower, re.I):
            reasons.append(f"Contains promise/guarantee language: {pat}")

    if not reasons:
        return True, [], text

    # Soften: replace "diagnosis" with "screening patterns", "definitely" with "suggests"
    adjusted = re.sub(r"\bdiagnos(e|ed|is|ing)\b", "screening patterns", adjusted, flags=re.I)
    adjusted = re.sub(r"\bdefinitely\b", "suggests", adjusted, flags=re.I)
    adjusted = re.sub(r"\bnormal\b", "within expected range", adjusted, flags=re.I)
    adjusted = re.sub(r"\bautism\b", "developmental patterns", adjusted, flags=re.I)
    adjusted = re.sub(r"\bADHD\b", "attention-related patterns", adjusted, flags=re.I)

    # If we couldn't fully soften, mark as needs review
    for pat in DIAGNOSIS_PATTERNS + PROMISE_PATTERNS:
        if re.search(pat, adjusted.lower(), re.I):
            return False, reasons, adjusted

    return True, reasons, adjusted


def apply_safety_to_result(
    risk_level: str,
    confidence: float,
    clinician_summary: str,
    parent_summary: str,
    rationale: List[str],
) -> Tuple[str, float, str, str, List[str]]:
    """
    Apply safety agent to screening result fields.
    If rejected: lower confidence, set risk_level to "discuss", soften text.
    Returns (risk_level, confidence, clinician_summary, parent_summary, rationale).
    """
    all_text = f"{clinician_summary} {parent_summary} " + " ".join(rationale)
    ok, reasons, _ = check_safety(all_text)

    if ok:
        return risk_level, confidence, clinician_summary, parent_summary, rationale

    # Safety rejected: soften and escalate to discuss
    out_risk = "discuss" if risk_level != "refer" else risk_level
    out_conf = max(0.0, confidence - 0.15)

    ok_c, _, adj_c = check_safety(clinician_summary)
    ok_p, _, adj_p = check_safety(parent_summary)
    out_clinician = adj_c if not ok_c else clinician_summary
    out_parent = adj_p if not ok_p else parent_summary

    out_rationale = []
    for r in rationale:
        ok_r, _, adj_r = check_safety(r)
        out_rationale.append(adj_r if not ok_r else r)

    return out_risk, out_conf, out_clinician, out_parent, out_rationale
