# orchestrator/app/auth.py — API key dependency for FastAPI (service-to-service / dev)
import os
from fastapi import Header, HTTPException

API_KEY = os.environ.get("API_KEY")


async def require_api_key(x_api_key: str = Header(..., alias="x-api-key")):
    """Validate x-api-key header. If API_KEY is not set (dev), allow all."""
    if not API_KEY:
        return True
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True
