# backend/app/core/security.py
from fastapi import Header, HTTPException, status, Depends
from app.core.config import settings

async def get_api_key(x_api_key: str = Header(...)):
    if not x_api_key or x_api_key != settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API Key"
        )
    return x_api_key
