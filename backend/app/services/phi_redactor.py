"""
PHI Redactor — redact personally identifiable information before external model calls.
Use before any text is sent to MedGemma, Vertex, or other external APIs.
Regex-based; optionally use spaCy NER for production (pip install spacy && python -m spacy download en_core_web_sm).
"""
import re
from typing import Dict, Any

# Common PHI patterns — conservative regexes to avoid over-redaction
PHI_PATTERNS = [
    # SSN: XXX-XX-XXXX
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "[REDACTED_SSN]"),
    # SSN without dashes (only when 9 consecutive digits)
    (re.compile(r"\b\d{3}\s?\d{2}\s?\d{4}\b"), "[REDACTED_SSN]"),
    # Date of birth patterns (MM/DD/YYYY, YYYY-MM-DD)
    (re.compile(r"\b\d{1,2}/\d{1,2}/\d{4}\b"), "[REDACTED_DOB]"),
    (re.compile(r"\b\d{4}-\d{2}-\d{2}\b"), "[REDACTED_DOB]"),
    # Phone numbers (US)
    (re.compile(r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b"), "[REDACTED_PHONE]"),
    # Email
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"), "[REDACTED_EMAIL]"),
    # MRN / medical record numbers (common formats)
    (re.compile(r"\bMRN\s*:?\s*\d{6,}\b", re.I), "[REDACTED_MRN]"),
    (re.compile(r"\bmedical record\s*(?:#|number)?\s*:?\s*\d{6,}\b", re.I), "[REDACTED_MRN]"),
]


def redact_text(text: str) -> Dict[str, Any]:
    """
    Redact PHI from text. Returns dict with redacted_text and metadata.
    Run this before sending observations to any external model.
    """
    if not text or not isinstance(text, str):
        return {"redacted_text": text or "", "redactions": [], "redaction_applied": True}

    out = text
    redactions = []

    for pat, repl in PHI_PATTERNS:
        for m in pat.finditer(out):
            if callable(repl):
                replacement = repl(m)
            else:
                replacement = repl
            redactions.append({"type": replacement.strip("[]"), "span": m.span()})
        out = pat.sub(repl if not callable(repl) else lambda m: repl(m), out)

    return {
        "redacted_text": out,
        "redactions": redactions,
        "redaction_applied": True,
        "redaction_count": len(redactions),
    }
