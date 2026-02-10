from .base import BaseAgent
from ..schemas.models import CasePayload, AgentResponse

class VisionQA_Agent(BaseAgent):
    @property
    def name(self) -> str:
        return "VisionQA_Agent"

    @property
    def role(self) -> str:
        return "Provide targeted visual feature extraction."

    async def process(self, payload: CasePayload) -> AgentResponse:
        # Mock feature extraction based on presence of embeddings
        features = {}
        if payload.embeddings:
            features = {
                "pincer_present": True,
                "handedness": "right_preference",
                "object_count": 3
            }
            
        return AgentResponse(
            success=True,
            data={"features": features},
            log_entry="Extracted visual features from embeddings."
        )
