# telemetry_service/app/schemas.py
from pydantic import BaseModel
from typing import Optional, Any, List
from datetime import datetime, date


class TelemetryEventIn(BaseModel):
    event_id: str
    timestamp: datetime
    org_id: Optional[str] = None
    app: Optional[str] = None
    user_id: Optional[str] = None
    case_id: Optional[str] = None
    model: Optional[dict] = None
    request: Optional[dict] = None
    response: Optional[dict] = None
    cost_estimate_usd: Optional[float] = None
    region: Optional[str] = None
    agent: Optional[str] = None
    trace_id: Optional[str] = None


class OverviewResponse(BaseModel):
    active_connection: bool
    last_used: Optional[datetime] = None
    total_requests: int
    number_of_models: int
    top_model: Optional[dict] = None
    timeseries: List[dict] = []
