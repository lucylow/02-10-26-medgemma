from .base import BaseAgent
from ..schemas.models import CasePayload, AgentResponse

class IntakeAgent(BaseAgent):
    @property
    def name(self) -> str:
        return "IntakeAgent"

    @property
    def role(self) -> str:
        return "Validate incoming payloads, extract metadata, enforce consent."

    async def process(self, payload: CasePayload) -> AgentResponse:
        # 1. Enforce consent
        if not payload.consent_id:
            return AgentResponse(
                success=False,
                error="Missing explicit consent (consent_id)."
            )
        
        # 2. Validate payload structure (Pydantic already did basic check)
        if not payload.case_id:
            return AgentResponse(success=False, error="Missing case_id.")
            
        # 3. Data leakage mitigation: pseudonymization (Mock)
        # In a real system, we'd replace PII with internal UUIDs here
        pseudonymized_id = f"pseudonym_{payload.case_id[-4:]}"
        
        # 4. Extract metadata / Normalize (Mock action)
        log_msg = f"Validated case {payload.case_id}. Consent {payload.consent_id} verified. Pseudonym: {pseudonymized_id}"
        
        return AgentResponse(
            success=True,
            data={"normalized": True, "pseudonym": pseudonymized_id},
            log_entry=log_msg
        )
