# backend/app/schemas/infra.py — pydantic models used by Infra API
from pydantic import BaseModel
from typing import List, Dict, Optional


class DeploymentSummary(BaseModel):
    name: str
    namespace: str
    replicas: int
    readyReplicas: int
    updatedReplicas: int
    image: str
    lastUpdate: str
    status: str  # Healthy/Degraded/Updating/Unknown
    gpuRequested: Optional[bool] = False
    pods: Optional[List[str]] = []


class NodeSummary(BaseModel):
    name: str
    labels: Dict[str, str]
    gpuAllocated: int
    gpuCapacity: int
    cpuAlloc: str
    memAlloc: str
    ready: bool


class HealthCheck(BaseModel):
    name: str
    ok: bool
    details: Optional[str] = None


class ConfigMapResp(BaseModel):
    data: Dict[str, str]


class SecretsListItem(BaseModel):
    name: str
    masked: str
    createdAt: str


class SecretsListResp(BaseModel):
    items: List[SecretsListItem]
