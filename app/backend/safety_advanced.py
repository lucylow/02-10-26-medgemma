from typing import Dict, List

def advanced_safety(medgemma_output: Dict, observations: str) -> Dict:
    """
    Runs safety checks on MedGemma output.
    - Checks for banned phrases (e.g., direct diagnosis)
    - Checks confidence thresholds
    - Could include NLI or entailment checks
    """
    reasons = []
    ok = True

    # 1. Banned phrases check
    banned_phrases = ["diagnose", "diagnosis", "cure", "prescribe"]
    text_output = str(medgemma_output).lower()
    for phrase in banned_phrases:
        if phrase in text_output:
            ok = False
            reasons.append(f"banned_phrase:{phrase}")

    # 2. Confidence check
    # risk_stratification is expected to have a confidence field
    risk = medgemma_output.get("risk_stratification", {})
    confidence = risk.get("confidence", 0.0)
    if confidence < 0.6:
        ok = False
        reasons.append("low_confidence")

    return {
        "ok": ok,
        "reasons": reasons,
        "action": "ACCEPT" if ok else "REJECT"
    }
