from .base import BaseAgent
from .schemas import AgentContext, ScreeningSummary

class ClinicalReasoningAgent(BaseAgent):
    name = "clinical_reasoning_agent"

    def run(self, ctx: AgentContext) -> AgentContext:
        # In real impl: call MedGemma
        ctx.screening = ScreeningSummary(
            findings=[
                "Limited progression in fine motor complexity",
                "Repetition of whole-hand grasp patterns"
            ],
            risk_level="moderate",
            rationale="Repeated motor patterns across time without refinement",
            suggested_next_steps=[
                "Repeat screening in 3 months",
                "Consider OT referral if persistence continues"
            ]
        )
        return ctx
