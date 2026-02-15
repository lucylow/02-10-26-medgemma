"""
PediScreen AI - MedGemma Training Data Formatter

Formats synthetic screening records as MedGemma chat template for SFT.
Supports both messages format and causal-LM text format (prompt + target).
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

SYSTEM_PROMPT = """You are a medical assistant providing pediatric developmental SCREENING support only.
Analyze caregiver observations and provide structured screening output.
NEVER diagnose. Use screening language only: "on_track", "monitor", "discuss", "refer"."""


def format_for_medgemma(records: List[Any]) -> List[Dict]:
    """Format records as MedGemma chat template for fine-tuning."""
    formatted = []

    for r in records:
        record_id = getattr(r, "record_id", "unknown")
        age = getattr(r, "age_months", 24)
        domain = getattr(r, "domain", "communication")
        text = getattr(r, "caregiver_text", "")
        risk = getattr(r, "clinician_risk", "on_track")

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"""Age: {age} months
Domain: {domain}
Caregiver observation: {text}

Provide structured JSON output only.""",
            },
            {
                "role": "assistant",
                "content": json.dumps({
                    "risk_level": risk,
                    "confidence": 0.85,
                    "rationale": ["CDC milestone alignment", "caregiver report consistency"],
                    "recommendations": ["Continue routine monitoring"] if risk == "on_track" else ["Consider follow-up screening"],
                }),
            },
        ]
        formatted.append({"messages": messages, "record_id": record_id})

    return formatted


def format_example_for_sft(
    ex: Dict[str, Any],
    tokenizer: Optional[Any] = None,
) -> Dict[str, str]:
    """
    Format a single example for SFT causal LM training.

    Input format:
        {"input": "user prompt (age, context, question)", "output": "{\"risk\": \"...\", ...}"}
    Or from synthetic records: age_months, domain, caregiver_text, clinician_risk.

    Returns {"text": prompt + target} for causal LM.
    Uses tokenizer.apply_chat_template when available; otherwise manual template.
    """
    if "input" in ex and "output" in ex:
        user_input = ex["input"]
        target = ex["output"]
    else:
        age = ex.get("age_months", 24)
        domain = ex.get("domain", "communication")
        text = ex.get("caregiver_text", "")
        risk = ex.get("clinician_risk", "on_track")
        user_input = f"""Age: {age} months
Domain: {domain}
Caregiver observation: {text}

Provide structured JSON output only."""
        target = json.dumps({
            "risk_level": risk,
            "confidence": 0.85,
            "rationale": ["CDC milestone alignment", "caregiver report consistency"],
            "recommendations": ["Continue routine monitoring"] if risk == "on_track" else ["Consider follow-up screening"],
        })

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_input},
        {"role": "assistant", "content": target},
    ]

    if tokenizer is not None and hasattr(tokenizer, "apply_chat_template"):
        # Use MedGemma/Gemma chat template (start_of_turn, end_of_turn, etc.)
        prompt = tokenizer.apply_chat_template(
            messages[:-1],
            tokenize=False,
            add_generation_prompt=True,
        )
        return {"text": prompt + target}
    else:
        # Fallback: manual Gemma-style template (MedGemma uses <bos>, <start_of_turn>, <end_of_turn>)
        bos = str(tokenizer.bos_token) if tokenizer and getattr(tokenizer, "bos_token", None) else "<bos>"
        prompt = f"""{bos}<start_of_turn>system
{SYSTEM_PROMPT}
<end_of_turn>
<start_of_turn>user
{user_input}
<end_of_turn>
<start_of_turn>assistant
"""
        return {"text": prompt + target}
