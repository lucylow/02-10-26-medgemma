from .base import BaseAgent
from .schemas import AgentContext, VisionSignal
import uuid

class VisionAgent(BaseAgent):
    name = "vision_agent"

    def run(self, ctx: AgentContext) -> AgentContext:
        # MedSigLIP embeddings already computed upstream
        ctx.vision = VisionSignal(
            embedding_id=str(uuid.uuid4()),
            similarity_trend="stable",
            variability_score=0.18,
            notes="Low variation across sessions"
        )
        return ctx
