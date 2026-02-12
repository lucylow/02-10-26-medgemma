# backend/app/api/screenings.py
from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_api_key
from app.services.db import get_db
from bson import ObjectId
from typing import List

router = APIRouter()

@router.get("/api/screenings", dependencies=[Depends(get_api_key)])
async def list_screenings(limit: int = 50, skip: int = 0):
    db = get_db()
    cursor = db.screenings.find().sort("timestamp", -1).skip(skip).limit(limit)
    res = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        res.append(doc)
    return {"items": res, "count": len(res)}

@router.get("/api/screenings/{screening_id}", dependencies=[Depends(get_api_key)])
async def get_screening(screening_id: str):
    db = get_db()
    doc = await db.screenings.find_one({"screening_id": screening_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    doc["_id"] = str(doc["_id"])
    return doc
