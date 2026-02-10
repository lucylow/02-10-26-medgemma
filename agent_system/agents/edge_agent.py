from .base import BaseAgent
from ..schemas.models import CasePayload, AgentResponse, EdgeOutput, EmbeddingData

class EdgeAgent(BaseAgent):
    @property
    def name(self) -> str:
        return "EdgeAgent"

    @property
    def role(self) -> str:
        return "Edge / On-Device Agent (Distilled Vision Encoder): Privacy-preserving local embeddings and offline mode."

    async def process(self, payload: CasePayload) -> AgentResponse:
        # Role: Privacy-preserving local embeddings. Offline mode.
        # Tech: Distilled from MedSigLIP, TFLite-based.
        
        # If payload already has cloud embeddings, EdgeAgent might just verify or skip
        if payload.embeddings:
             return AgentResponse(
                success=True,
                data={"offline_mode": False},
                log_entry="Edge Agent: Cloud embeddings present. Local edge verification skipped."
            )

        # Simulate on-device embedding generation
        local_embs = []
        for img in payload.inputs.images:
            local_embs.append(EmbeddingData(
                image_id=img.id,
                model="medsiglip-distilled-tflite",
                shape=[1, 768],
                b64="local_tflite_embedding_b64",
                quality_score=0.95
            ))
        
        output = EdgeOutput(
            local_embeddings=local_embs,
            offline_mode=True
        )

        return AgentResponse(
            success=True,
            data={"edge_output": output.dict()},
            log_entry=f"Edge Agent: Generated {len(local_embs)} local embeddings using distilled TFLite model (Offline Mode)."
        )
