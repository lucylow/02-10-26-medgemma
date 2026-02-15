"""
Enhanced Base Agent: memory-augmented execution with reflection.
"""
import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List

from orchestrator.memory.memory_manager import MemoryManager
from orchestrator.memory.reflection import ReflectionManager
from orchestrator.schemas import AgentMemory, MemoryAugmentedContext

logger = logging.getLogger("orchestrator.agents.base")


def _to_dict(obj) -> dict:
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    return obj.dict()


class EnhancedBaseAgent(ABC):
    """Base for memory-augmented agents with self-reflection."""

    def __init__(self, name: str, memory_manager: MemoryManager):
        self.name = name
        self.logger = logging.getLogger(f"pediscreen.agents.{name}")
        self.memory = memory_manager
        self.reflection = ReflectionManager(memory_manager)

    async def execute_with_memory(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Enhanced execute: memory → agent → reflection → store."""
        mem_context = await self._retrieve_context(context)

        start_time = datetime.utcnow()
        try:
            result = await self._execute_core(mem_context)
            success = True
        except Exception as e:
            result = {"error": str(e)}
            success = False
            self.logger.error("Agent %s failed: %s", self.name, e)

        duration = (datetime.utcnow() - start_time).total_seconds()

        reflection = await self.reflection.reflect_on_output(
            context.get("case_id", ""),
            self.name,
            context,
            result,
            success,
        )

        confidence = result.get("confidence", 0.5) if success else 0.0
        content = dict(result)
        content["domain"] = context.get("domain", "")
        if context.get("child_id"):
            content["child_id"] = context["child_id"]

        await self.memory.store_short_term_memory(
            context.get("case_id", ""),
            self.name,
            content,
            confidence,
        )

        try:
            mem_dict = _to_dict(mem_context)
        except Exception:
            mem_dict = {"current_case": context}
        return {
            "result": result,
            "memory_context": mem_dict,
            "reflection": _to_dict(reflection),
            "success": success,
            "duration_ms": duration * 1000,
        }

    async def _retrieve_context(self, context: Dict[str, Any]) -> MemoryAugmentedContext:
        """Fetch relevant memory for this agent."""
        memories: List[AgentMemory] = []
        trend = None

        if self.memory.available:
            memories = await self.memory.retrieve_relevant_memory(
                context.get("case_id", ""),
                self.name,
                context.get("domain", "communication"),
                top_k=5,
                child_id=context.get("child_id"),
            )
            trend = await self.memory.get_longitudinal_trend(
                context.get("child_id", ""),
                months_span=12,
            )

        return MemoryAugmentedContext(
            current_case=context,
            relevant_history=[],
            agent_memories=memories,
            reflections=[],
            longitudinal_trend=trend,
        )

    @abstractmethod
    async def _execute_core(
        self, mem_context: MemoryAugmentedContext
    ) -> Dict[str, Any]:
        """Override: core agent logic that uses memory context."""
        pass
