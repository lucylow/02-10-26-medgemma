from .base import BaseAgent
from .schemas import AgentContext, ParentExplanation

class ParentCommunicationAgent(BaseAgent):
    name = "parent_comm_agent"

    def run(self, ctx: AgentContext) -> AgentContext:
        if "safety_review_required" in ctx.flags:
            # Note: The issue description uses RuntimeError here, which will be caught by the orchestrator
            raise RuntimeError("Unsafe to generate parent explanation")

        summary = ctx.screening

        text = (
            "Some developmental skills are still emerging. "
            "This doesn’t mean something is wrong, but it may help "
            "to keep an eye on progress and repeat screening later."
        )

        ctx.parent_explanation = ParentExplanation(
            text=text,
            reading_level="6th-grade"
        )
        return ctx
