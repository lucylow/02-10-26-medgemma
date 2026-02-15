from ..agents.schemas import AgentContext
from ..agents.vision_agent import VisionAgent
from ..agents.clinical_agent import ClinicalReasoningAgent
from ..agents.safety_agent import SafetyAgent
from ..agents.parent_comm_agent import ParentCommunicationAgent

class AgentGraph:
    def __init__(self):
        self.vision = VisionAgent()
        self.clinical = ClinicalReasoningAgent()
        self.safety = SafetyAgent()
        self.parent = ParentCommunicationAgent()

    def run(self, ctx: AgentContext) -> AgentContext:
        ctx = self.vision.run(ctx)
        ctx = self.clinical.run(ctx)
        ctx = self.safety.run(ctx)

        # Routing decision
        if "safety_review_required" not in ctx.flags:
            try:
                ctx = self.parent.run(ctx)
            except RuntimeError:
                # Safety agent might have flagged it, double check
                pass

        return ctx
