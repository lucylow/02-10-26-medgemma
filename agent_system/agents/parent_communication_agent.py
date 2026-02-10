from .base import BaseAgent
from ..schemas.models import CasePayload, AgentResponse, ParentCommunicationOutput

class ParentCommunicationAgent(BaseAgent):
    @property
    def name(self) -> str:
        return "ParentCommunicationAgent"

    @property
    def role(self) -> str:
        return "Parent Communication Agent (Gemma 3): Rewrite clinician-approved summaries for tone, clarity, and multilingual support."

    async def process(self, payload: CasePayload) -> AgentResponse:
        if not payload.medgemma_output:
            return AgentResponse(success=False, error="No clinician-approved content to rewrite.")
        
        # Role: Gemma 3. Rewrite clinician-approved summaries. Adjust tone, language, reading level.
        # Strict constraints: Input = clinician-approved content only. No new facts. No medical claims.
        
        clinical_summary = " ".join(payload.medgemma_output.summary)
        
        # Mocking Gemma 3 rewriting process
        # Prompting pattern: Rewrite for parents. Do not add new information. Do not mention diagnoses.
        parent_friendly_text = f"Your child is doing great! Based on the screening, {clinical_summary.lower().replace('.', '')}, which is a wonderful sign of development. Let's keep supporting their growth with play!"

        output = ParentCommunicationOutput(
            parent_summary=parent_friendly_text,
            tone="reassuring",
            language="en",
            reading_level="grade-6"
        )

        return AgentResponse(
            success=True,
            data={"parent_communication": output.dict()},
            log_entry="Parent Communication Agent: Clinician summary rewritten for parents using Gemma 3 (Mock)."
        )
