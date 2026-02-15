"""
Memory Manager: persistent agent memory with MongoDB.
Graceful degradation when MongoDB unavailable.
"""
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from orchestrator.config import settings
from orchestrator.schemas import AgentMemory, ReflectionLog

logger = logging.getLogger("orchestrator.memory")


def _to_dict(obj) -> dict:
    """Pydantic v1/v2 compatibility."""
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    return obj.dict()


class MemoryManager:
    """Manages agent memory storage and retrieval with MongoDB."""

    def __init__(self):
        self._client = None
        self._db = None
        self._collection = None
        self._reflection_collection = None
        self._available = False
        self._init_client()

    def _init_client(self):
        """Initialize MongoDB client. Graceful failure when unavailable."""
        if settings.MEMORY_DISABLED or not settings.MONGODB_URI:
            logger.info("Memory disabled or no MONGODB_URI; memory layer will no-op")
            return
        try:
            from motor.motor_asyncio import AsyncIOMotorClient

            self._client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=3000,
            )
            self._db = self._client[settings.MONGODB_DB]
            self._collection = self._db["agent_memory"]
            self._reflection_collection = self._db["agent_reflections"]
            self._available = True
            logger.info("Memory manager connected to MongoDB")
        except ImportError as e:
            logger.warning("motor not installed; memory disabled: %s", e)
        except Exception as e:
            logger.warning("MongoDB connection failed; memory disabled: %s", e)

    @property
    def available(self) -> bool:
        return self._available

    async def store_short_term_memory(
        self,
        case_id: str,
        agent_name: str,
        memory_content: Dict[str, Any],
        confidence: float,
        session_id: Optional[str] = None,
    ) -> None:
        """Store working memory for current session (24h TTL)."""
        if not self._available:
            return
        try:
            memory = AgentMemory(
                case_id=case_id,
                agent_name=agent_name,
                session_id=session_id or case_id,
                memory_type="short_term",
                content=memory_content,
                confidence=confidence,
                expires_at=datetime.utcnow() + timedelta(hours=24),
            )
            doc = _to_dict(memory)
            doc["created_at"] = memory.created_at
            doc["expires_at"] = memory.expires_at
            await self._collection.insert_one(doc)
        except Exception as e:
            logger.warning("store_short_term_memory failed: %s", e)

    async def store_long_term_memory(
        self,
        case_id: str,
        agent_name: str,
        memory_content: Dict[str, Any],
        confidence: float,
        child_id: Optional[str] = None,
    ) -> None:
        """Store persistent patterns/insights."""
        if not self._available:
            return
        try:
            content = dict(memory_content)
            if child_id:
                content["child_id"] = child_id
            memory = AgentMemory(
                case_id=case_id,
                agent_name=agent_name,
                session_id="persistent",
                memory_type="long_term",
                content=content,
                confidence=confidence,
            )
            doc = _to_dict(memory)
            doc["created_at"] = memory.created_at
            await self._collection.insert_one(doc)
        except Exception as e:
            logger.warning("store_long_term_memory failed: %s", e)

    async def store_reflection(self, reflection: ReflectionLog) -> None:
        """Log agent self-reflection for analysis."""
        if not self._available:
            return
        try:
            doc = _to_dict(reflection)
            doc["timestamp"] = reflection.timestamp
            await self._reflection_collection.insert_one(doc)
        except Exception as e:
            logger.warning("store_reflection failed: %s", e)

    async def retrieve_relevant_memory(
        self,
        case_id: str,
        agent_name: str,
        domain: str,
        top_k: int = 5,
        child_id: Optional[str] = None,
    ) -> List[AgentMemory]:
        """
        Retrieve relevant past memories: same agent + domain, recency-ordered.
        Uses simple query (no vector search) for compatibility.
        """
        if not self._available:
            return []
        try:
            now = datetime.utcnow()
            match = {
                "agent_name": agent_name,
                "$or": [
                    {"expires_at": {"$exists": False}},
                    {"expires_at": {"$gt": now}},
                ],
            }
            if child_id:
                match["content.child_id"] = child_id

            cursor = (
                self._collection.find(match)
                .sort("created_at", -1)
                .limit(top_k * 3)
            )
            docs = await cursor.to_list(length=top_k * 3)
            # Prefer same domain when available in content
            same_domain = [d for d in docs if d.get("content", {}).get("domain") == domain]
            other = [d for d in docs if d not in same_domain]
            docs = (same_domain + other)[:top_k]
            result = []
            for d in docs:
                clean = {k: v for k, v in d.items() if k != "_id"}
                clean.setdefault("created_at", now)
                result.append(AgentMemory(**clean))
            return result
        except Exception as e:
            logger.warning("retrieve_relevant_memory failed: %s", e)
            return []

    async def get_longitudinal_trend(
        self, child_id: str, months_span: int = 12
    ) -> Optional[Dict[str, Any]]:
        """Track developmental progression over time for a child."""
        if not self._available or not child_id:
            return None
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=months_span * 30)
            pipeline = [
                {
                    "$match": {
                        "content.child_id": child_id,
                        "memory_type": "long_term",
                        "created_at": {"$gte": start_date, "$lte": end_date},
                    }
                },
                {"$sort": {"created_at": 1}},
                {
                    "$group": {
                        "_id": "$agent_name",
                        "risk_trend": {"$push": "$content.risk_level"},
                        "confidence_trend": {"$push": "$content.confidence"},
                        "dates": {"$push": "$created_at"},
                    }
                },
            ]
            cursor = self._collection.aggregate(pipeline)
            trends = await cursor.to_list(None)
            return {"trends": trends} if trends else None
        except Exception as e:
            logger.warning("get_longitudinal_trend failed: %s", e)
            return None
