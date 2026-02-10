from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from ..schemas.models import CasePayload
from ..orchestrator.core import CentralOrchestrator

app = FastAPI(title="PediScreen Orchestrator API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = CentralOrchestrator()

@app.post("/orchestrate")
async def orchestrate(case: CasePayload):
    result = await orchestrator.run_workflow(case)
    return result.dict()

if __name__ == "__main__":
    uvicorn.run("agent_system.api.main:app", host="0.0.0.0", port=8010)
