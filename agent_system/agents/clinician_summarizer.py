from .base import BaseAgent
from ..schemas.models import CasePayload, AgentResponse

class ClinicianSummarizerAgent(BaseAgent):
    @property
    def name(self) -> str:
        return "ClinicianSummarizerAgent"

    @property
    def role(self) -> str:
        return "Format the accepted screening summary into EHR-ready text and an editable clinician card."

    async def process(self, payload: CasePayload) -> AgentResponse:
        if not payload.medgemma_output:
            return AgentResponse(success=False, error="No MedGemma output.")
            
        summary = payload.medgemma_output.summary[0] if payload.medgemma_output.summary else ""
        risk = payload.medgemma_output.risk
        
        ehr_note = f"""
PEDISCREEN CLINICAL NOTE
Case ID: {payload.case_id}
Date: {payload.inputs.images[0].capture_ts if payload.inputs.images else "N/A"}
---
FINDINGS:
{summary}

RISK LEVEL: {risk.upper()}
RECOMMENDATIONS:
{chr(10).join("- " + s for s in payload.medgemma_output.next_steps)}
"""
        return AgentResponse(
            success=True,
            data={"ehr_ready_text": ehr_note},
            log_entry="Formatted EHR-ready note for clinician."
        )
