"""
PediScreen JSON output validation — schema compliance and safe CDS language.
Ensures fine-tuned model produces valid PediScreen JSON with required fields
and appropriate clinical decision support (CDS) language.
"""
import json
import re
from typing import Any, Dict, List, Optional, Tuple

# Required fields for PediScreen structured output
REQUIRED_FIELDS = frozenset({"risk", "summary", "rationale", "next_steps", "confidence"})

# Aliases for fields (model may use different keys)
FIELD_ALIASES = {
    "risk": {"risk", "risk_level", "riskLevel"},
    "summary": {"summary", "clinical_summary", "plain_language_summary"},
    "rationale": {"rationale", "reasoning", "keyFindings"},
    "next_steps": {"next_steps", "recommendations"},
    "confidence": {"confidence"},
}

# Safe CDS language — rationale must use at least one of these (no diagnosis)
SAFE_LANGUAGE = frozenset({
    "monitor", "monitoring", "discuss", "discussion", "screening", "evaluation",
    "consider", "follow-up", "follow up", "referral", "patterns", "suggests",
    "may indicate", "within typical", "typical range", "routine", "observation",
})


def validate_json_schema(outputs: List[Dict[str, Any]]) -> float:
    """
    Validate that model outputs conform to PediScreen JSON schema.
    Returns compliance rate: 1 - (violations / len(outputs)).
    """
    if not outputs:
        return 1.0
    violations = 0
    for output in outputs:
        if not _output_has_required_fields(output):
            violations += 1
        elif not _output_uses_safe_language(output):
            violations += 1
    return 1.0 - (violations / len(outputs))


def validate_single_output(output: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validate a single model output. Returns (is_valid, list of violation messages).
    """
    violations: List[str] = []
    if not _output_has_required_fields(output):
        missing = _missing_required_fields(output)
        violations.append(f"Missing required fields: {missing}")
    if not _output_uses_safe_language(output):
        violations.append("Rationale does not use safe CDS language (monitor, discuss, screening, etc.)")
    return len(violations) == 0, violations


def _output_has_required_fields(output: Dict[str, Any]) -> bool:
    """Check that output contains all required fields (possibly under aliases)."""
    if not isinstance(output, dict):
        return False
    for field in REQUIRED_FIELDS:
        if not _has_field(output, field):
            return False
    return True


def _has_field(output: Dict[str, Any], field: str) -> bool:
    """Check if output has the field under any of its aliases."""
    aliases = FIELD_ALIASES.get(field, {field})
    for key in output:
        if key in aliases and output[key] is not None:
            return True
    return False


def _missing_required_fields(output: Dict[str, Any]) -> List[str]:
    """Return list of missing required field names."""
    missing = []
    for field in REQUIRED_FIELDS:
        if not _has_field(output, field):
            missing.append(field)
    return missing


def _get_rationale_text(output: Dict[str, Any]) -> str:
    """Extract rationale text from output (may be string or list)."""
    for key in ("rationale", "reasoning", "keyFindings"):
        val = output.get(key)
        if val is None:
            continue
        if isinstance(val, str):
            return val.lower()
        if isinstance(val, list):
            parts = []
            for item in val:
                if isinstance(item, str):
                    parts.append(item.lower())
                elif isinstance(item, dict) and "description" in item:
                    parts.append(str(item["description"]).lower())
            return " ".join(parts)
    return ""


def _output_uses_safe_language(output: Dict[str, Any]) -> bool:
    """Ensure rationale uses safe CDS language (no diagnosis terms)."""
    text = _get_rationale_text(output)
    if not text.strip():
        return False
    return any(phrase in text for phrase in SAFE_LANGUAGE)


def validate_json_parse(raw_outputs: List[str]) -> float:
    """
    Validate that raw model outputs can be parsed as valid JSON.
    Returns fraction that parse successfully.
    """
    if not raw_outputs:
        return 1.0
    ok = 0
    for raw in raw_outputs:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                ok += 1
            else:
                # Try to extract JSON from markdown code block
                match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
                if match:
                    parsed = json.loads(match.group(1).strip())
                    if isinstance(parsed, dict):
                        ok += 1
        except (json.JSONDecodeError, TypeError):
            pass
    return ok / len(raw_outputs)
