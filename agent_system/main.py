from fastapi import FastAPI, HTTPException
from .schemas.models import CasePayload
from .orchestrator.core import CentralOrchestrator
import uuid
from datetime import datetime

app = FastAPI(title="PediScreen Multi-Agent System")
orchestrator = CentralOrchestrator()

@app.post("/agent/process", response_model=CasePayload)
async def process_case(payload: CasePayload):
    """
    Entry point for the Multi-Agent System.
    Routes the payload through Intake, Embedding, Vision QA, MedGemma, and Safety agents.
    """
    try:
        result = await orchestrator.run_workflow(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok", "agents": list(orchestrator.agents.keys())}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
