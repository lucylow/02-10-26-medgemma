"""
Policy engine — detect and rewrite risky claim language in AI outputs.
Blocks or rewrites phrases that could imply diagnosis / high legal risk.
Use before returning any AI-generated narrative to the client.
"""
import re
from typing import Tuple

# (pattern, replacement) — prefer blocking and audit over silent rewrite
FORBIDDEN = [
    (re.compile(r"\bdiagnos(?:e|is|ing)\b", re.I), "[DIAGNOSTIC_TERM_REDACTED]"),
    (re.compile(r"\bdefinitive diagnosis\b", re.I), "[DIAGNOSTIC_TERM_REDACTED]"),
    (re.compile(r"\b100% certain\b", re.I), "[UNCERTAINTY_TERM_REDACTED]"),
    (re.compile(r"\bguarantee\b", re.I), "[STRONG_CLAIM_REDACTED]"),
    (re.compile(r"\bshould not be seen by a clinician\b", re.I), "[DISALLOWED_CLAIM_REDACTED]"),
    (re.compile(r"\breplace the clinician\b", re.I), "[DISALLOWED_CLAIM_REDACTED]"),
]


def scan_and_rewrite(text: str) -> Tuple[str, bool]:
    """
    Returns (rewritten_text, modified_flag).
    If modified, include an audit entry and flag for clinician review.
    """
    if not text or not isinstance(text, str):
        return text or "", False
    modified = False
    out = text
    for pat, repl in FORBIDDEN:
        if pat.search(out):
            out = pat.sub(repl, out)
            modified = True
    return out, modified


def scan_forbidden(text: str) -> list[Tuple[str, str]]:
    """
    Return list of (pattern_name, matched_sample) for audit.
    Does not modify text.
    """
    matches = []
    for pat, repl in FORBIDDEN:
        m = pat.search(text)
        if m:
            matches.append((repl.strip("[]"), m.group()))
    return matches
