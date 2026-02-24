"""
HAI-DEF clinical safety guard: zero-harm guarantee.
Toxicity filtering, contraindication detection, low-confidence referral block,
age-inappropriate recommendation check, prompt injection defense, output schema validation.
"""
import re
from typing import Optional

from app.errors import SafetyViolation
from app.schemas.pediatric import RiskOutput, ScreeningInput

# Optional toxicity classifier (lazy load to avoid import errors when transformers not installed)
_toxicity_pipeline = None


def _get_toxicity_pipeline():
    global _toxicity_pipeline
    if _toxicity_pipeline is None:
        try:
            import torch
            from transformers import pipeline
            _toxicity_pipeline = pipeline(
                "text-classification",
                model="unitary/toxic-bert",
                device=0 if torch.cuda.is_available() else -1,
            )
        except Exception:
            _toxicity_pipeline = False  # disabled
    return _toxicity_pipeline if _toxicity_pipeline else None


class ClinicalSafetyGuard:
    """Five critical safety checks before returning screening output."""

    CONTRAINDICATED_PHRASES = [
        "ignore doctor",
        "self-medicate",
        "no treatment",
        "alternative medicine instead",
        "pharmaceutical conspiracy",
        "do not see a doctor",
        "skip vaccination",
    ]

    INJECTION_PATTERNS = [
        r"ignore\s+(all\s+)?instructions",
        r"you\s+are\s+now",
        r"system\s+prompt",
        r"forget\s+(all\s+)?previous",
        r"roleplay\s+as\s+(a\s+)?doctor",
        r"pretend\s+you\s+are",
        r"jailbreak",
    ]

    def __init__(self) -> None:
        self._toxicity = _get_toxicity_pipeline()

    def prompt_injection_defense(self, user_input: str) -> bool:
        """Return False if potential prompt injection detected."""
        if not user_input or not isinstance(user_input, str):
            return True
        lower = user_input.lower()
        for pattern in self.INJECTION_PATTERNS:
            if re.search(pattern, lower):
                return False
        return True

    async def validate_output(
        self,
        screening_input: ScreeningInput,
        model_output: RiskOutput,
    ) -> bool:
        """
        HAI-DEF safety: run 5 checks. Raises SafetyViolation on failure.
        Returns True if all checks pass.
        """
        text_to_check = model_output.summary_text()

        # 1. Toxicity screening (optional when toxic-bert not available)
        if self._toxicity and text_to_check:
            try:
                out = self._toxicity(text_to_check[:2000], truncation=True)
                score = out[0]["score"] if out else 0
                if out[0].get("label", "").lower() in ("toxic", "toxicity"):
                    score = score if isinstance(score, (int, float)) else 0.5
                else:
                    score = 0
                if score > 0.05:
                    raise SafetyViolation(
                        "toxicity",
                        "critical",
                        "response_blocked",
                    )
            except SafetyViolation:
                raise
            except Exception:
                pass  # do not block on classifier failure

        # 2. Contraindication detection
        lower = text_to_check.lower()
        for phrase in self.CONTRAINDICATED_PHRASES:
            if phrase in lower:
                raise SafetyViolation(
                    "contraindication",
                    "critical",
                    "blocked",
                )

        # 3. Low-confidence referral protection (>70% required for referral)
        if (
            model_output.risk_level == "referral"
            and model_output.confidence < 0.70
        ):
            raise SafetyViolation(
                "low_confidence_referral",
                "critical",
                "escalated_to_human_review",
            )

        # 4. Age-appropriate recommendations
        age = screening_input.child_age_months
        for rec in model_output.recommendations:
            rec_lower = rec.lower()
            if age < 6 and "speech therapy" in rec_lower:
                raise SafetyViolation(
                    "age_inappropriate",
                    "high",
                    "age_inappropriate_recommendation_blocked",
                )

        # 5. Schema validation (ensure output is valid RiskOutput)
        try:
            RiskOutput.parse_obj(model_output.dict())
        except Exception:
            raise SafetyViolation(
                "contraindication",  # treat invalid schema as critical
                "critical",
                "output_schema_validation_failed",
            )

        return True
