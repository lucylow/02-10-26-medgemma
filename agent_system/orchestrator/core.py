from datetime import datetime
from typing import List
from ..schemas.models import CasePayload, AgentResponse, MedGemmaOutput, EmbeddingData, ParentCommunicationOutput, EdgeOutput
from ..agents.base import BaseAgent
from ..agents.intake_agent import IntakeAgent
from ..agents.embedding_agent import EmbeddingAgent
from ..agents.vision_qa_agent import VisionQA_Agent
from ..agents.medgemma_agent import MedGemmaAgent
from ..agents.safety_agent import SafetyAgent
from ..agents.temporal_agent import TemporalAgent
from ..agents.metrics_agent import MetricsAgent
from ..agents.retriever_agent import RetrieverAgent
from ..agents.audit_agent import AuditAgent
from ..agents.parent_communication_agent import ParentCommunicationAgent
from ..agents.edge_agent import EdgeAgent

class CentralOrchestrator:
    def __init__(self):
        self.agents = {
            "intake": IntakeAgent(),
            "embedding": EmbeddingAgent(),
            "edge": EdgeAgent(),
            "temporal": TemporalAgent(),
            "vision_qa": VisionQA_Agent(),
            "retriever": RetrieverAgent(),
            "medgemma": MedGemmaAgent(),
            "safety": SafetyAgent(),
            "parent_comm": ParentCommunicationAgent(),
            "metrics": MetricsAgent(),
            "audit": AuditAgent(),
        }

    async def run_workflow(self, payload: CasePayload) -> CasePayload:
        start_time = datetime.utcnow()
        payload.status = "processing"
        
        # 1. Intake
        await self._call_agent("intake", payload)
        if payload.status == "failed": return payload
        
        # 2. Edge / Local Processing (Optional Offline/Privacy step)
        await self._call_agent("edge", payload)
        # We don't fail here, it's a fallback/enhancement
        
        # 3. Embedding (Vision Encoding Agent - MedSigLIP)
        await self._call_agent("embedding", payload)
        if payload.status == "failed": return payload
        
        # 4. Temporal Analysis (Temporal Pattern Agent)
        await self._call_agent("temporal", payload)
        if payload.status == "failed": return payload

        # 5. Vision QA (Secondary features)
        await self._call_agent("vision_qa", payload)
        if payload.status == "failed": return payload

        # 6. Retriever (Retrieval Agent - MiniLM/bge-small)
        await self._call_agent("retriever", payload)
        if payload.status == "failed": return payload
        
        # 7. MedGemma Reasoning (Clinical Reasoning Agent)
        await self._call_agent("medgemma", payload)
        if payload.status == "failed": return payload
        
        # 8. Safety Guardrails (Safety & Compliance Agent - Rules + NLI)
        await self._call_agent("safety", payload)
        if payload.status == "failed": 
            # On safety failure, we still audit and return
            payload.metrics["safety_violation"] = True
            await self._call_agent("metrics", payload)
            await self._call_agent("audit", payload)
            return payload
        
        # 9. Parent Communication (Parent Communication Agent - Gemma 3)
        # Only run if approved by Safety
        await self._call_agent("parent_comm", payload)
        if payload.status == "failed": return payload

        payload.status = "completed"
        payload.metrics["total_latency"] = (datetime.utcnow() - start_time).total_seconds()
        
        # 10. Metrics Collection
        await self._call_agent("metrics", payload)
        # 11. Audit Logging (Audit & Explanation Agent)
        await self._call_agent("audit", payload)
        
        return payload

    async def _call_agent(self, agent_key: str, payload: CasePayload):
        agent = self.agents.get(agent_key)
        if not agent:
            return

        try:
            response = await agent.process(payload)
            
            # Log the action
            log_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "agent": agent.name,
                "success": response.success,
                "message": response.log_entry or response.error
            }
            payload.logs.append(log_entry)

            if not response.success:
                payload.status = "failed"
                return

            # Apply updates to payload based on agent
            if agent_key == "embedding" and response.data:
                for emb_dict in response.data.get("new_embeddings", []):
                    payload.embeddings.append(EmbeddingData(**emb_dict))
            
            elif agent_key == "edge" and response.data:
                if response.data.get("edge_output"):
                    payload.edge_output = EdgeOutput(**response.data.get("edge_output"))
                    # If we got local embeddings, use them if cloud failed
                    if not payload.embeddings and payload.edge_output.local_embeddings:
                        payload.embeddings.extend(payload.edge_output.local_embeddings)

            elif agent_key == "temporal" and response.data:
                payload.temporal = response.data

            elif agent_key == "vision_qa" and response.data:
                payload.features.update(response.data.get("features", {}))
            
            elif agent_key == "retriever" and response.data:
                payload.features["retrieval_examples"] = response.data.get("examples", [])
            
            elif agent_key == "medgemma" and response.data:
                payload.medgemma_output = MedGemmaOutput(**response.data.get("medgemma_output"))
            
            elif agent_key == "safety" and response.data:
                if response.data.get("override_risk") and payload.medgemma_output:
                    payload.medgemma_output.risk = response.data.get("override_risk")

            elif agent_key == "parent_comm" and response.data:
                payload.parent_communication = ParentCommunicationOutput(**response.data.get("parent_communication"))

        except Exception as e:
            payload.logs.append({
                "timestamp": datetime.utcnow().isoformat(),
                "agent": agent.name,
                "success": False,
                "message": f"Critical Agent Error: {str(e)}"
            })
            payload.status = "failed"
