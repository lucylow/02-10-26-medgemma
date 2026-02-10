from .base import BaseAgent
from ..schemas.models import CasePayload, AgentResponse
import json

class MetricsAgent(BaseAgent):
    @property
    def name(self) -> str:
        return "MetricsAgent"

    @property
    def role(self) -> str:
        return "Collect and aggregate technical, clinical, and quality metrics."

    async def process(self, payload: CasePayload) -> AgentResponse:
        # Technical metrics
        tech_metrics = {
            "embedding_retrieval_latency": 0.05, # Mock
            "medgemma_response_time": payload.metrics.get("medgemma_latency", 0),
            "safety_violation_rate": 1 if payload.metrics.get("safety_violation") else 0
        }
        
        # Clinical metrics (Mock)
        clinical_metrics = {
            "flagged_for_followup": 1 if payload.medgemma_output and payload.medgemma_output.risk != "low" else 0,
            "clinician_edit_rate": 0.12,
            "time_saved_per_visit_min": 5.5
        }
        
        # Quality metrics
        quality_metrics = {
            "json_parse_success": 1,
            "medgemma_output_accepted_by_safety": 1 if not payload.metrics.get("safety_violation") else 0,
            "low_quality_embeddings": payload.metrics.get("low_quality_count", 0)
        }
        
        payload.metrics.update({
            "technical": tech_metrics,
            "clinical": clinical_metrics,
            "quality": quality_metrics
        })
        
        # Log metrics for "plotting"
        log_msg = f"Metrics Collected: {json.dumps(payload.metrics, indent=2)}"
        
        return AgentResponse(
            success=True,
            data={"metrics": payload.metrics},
            log_entry="Metrics aggregated and logged."
        )
