"""
Auto red-flag system when edits violate safety constraints.
Prevents edits that sound diagnostic, remove disclaimers, or add prohibited language.
"""
from typing import List

PROHIBITED_PHRASES = [
    "diagnosis",
    "diagnosed",
    "treatment plan",
    "this tool determines",
    "medical advice",
    "definitively",
    "conclusively",
]

# At least one of these should appear when content is substantive (avoids removal of disclaimers)
REQUIRED_SAFETY_INDICATORS = [
    "requires clinician review",
    "clinician review",
    "decision support",
    "screening",
    "non-diagnostic",
]


def validate_edit(text: str) -> List[str]:
    """Returns list of flag messages; empty list means valid."""
    flags: List[str] = []
    lower = text.lower()

    for phrase in PROHIBITED_PHRASES:
        if phrase in lower:
            flags.append(f"Prohibited phrase detected: '{phrase}'")

    # Require safety indicator only when content is substantive (likely replacing AI output)
    if len(text.strip()) > 80:
        has_safety = any(ind in lower for ind in REQUIRED_SAFETY_INDICATORS)
        if not has_safety:
            flags.append(
                "Required safety phrase missing: include 'clinician review', 'decision support', "
                "or 'screening' to indicate non-diagnostic nature."
            )

    return flags
