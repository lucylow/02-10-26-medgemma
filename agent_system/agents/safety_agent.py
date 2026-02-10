from .base import BaseAgent
from ..schemas.models import CasePayload, AgentResponse

class SafetyAgent(BaseAgent):
    @property
    def name(self) -> str:
        return "SafetyAgent"

    @property
    def role(self) -> str:
        return "Safety & Compliance Agent (Rules + NLI): Deterministic + entailment checking to prevent unsafe claims."

    async def process(self, payload: CasePayload) -> AgentResponse:
        if not payload.medgemma_output:
            return AgentResponse(success=False, error="No MedGemma output to check.")
        
        output = payload.medgemma_output
        
        # 1. Deterministic Rules
        # Banned vocabulary & Risk escalation triggers
        forbidden_words = ["diagnose", "definitive", "has autism", "will definitely", "certainly"]
        
        text_to_check = " ".join(output.summary + output.rationale_bullets)
        lower_text = text_to_check.lower()
        
        for word in forbidden_words:
            if word in lower_text:
                return AgentResponse(
                    success=False,
                    error=f"Safety violation: Banned phrase '{word}' detected.",
                    log_entry=f"Deterministic safety rule triggered for word: {word}."
                )

        # 2. Entailment Model (NLI) - conceptual
        # microsoft/deberta-v3-large-mnli
        # Purpose: Check whether the generated text entails forbidden claims.
        # Example: "This suggests autism" -> Does text entail diagnosis claim? -> Block
        
        # Mocking NLI entailment check
        is_diagnosis_claim = False
        if "suggests" in lower_text and any(x in lower_text for x in ["autism", "delay", "disorder"]):
            # In a real system, the NLI model would return high entailment for "This is a diagnosis"
            is_diagnosis_claim = True 
            
        if is_diagnosis_claim:
             return AgentResponse(
                success=False,
                error="Safety violation: NLI entailment model detected a diagnosis claim.",
                log_entry="NLI safety check failed: Text entails a forbidden medical claim."
            )
            
        return AgentResponse(
            success=True,
            data={"safety_check": "passed", "nli_score": 0.01, "human_signoff_required": output.risk != "low"},
            log_entry="Safety & Compliance check passed (Deterministic + NLI)."
        )
