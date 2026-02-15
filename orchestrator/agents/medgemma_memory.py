"""
Memory-Enhanced MedGemma Agent: uses history and longitudinal trends.
"""
from typing import Any, Dict, List

from orchestrator.agents.base import EnhancedBaseAgent
from orchestrator.agents.medgemma_agent import run_medgemma
from orchestrator.schemas import MemoryAugmentedContext


class MemoryEnhancedMedGemmaAgent(EnhancedBaseAgent):
    """MedGemma agent with memory-augmented context."""

    def __init__(self, memory_manager):
        super().__init__("medgemma", memory_manager)

    async def _execute_core(
        self, mem_context: MemoryAugmentedContext
    ) -> Dict[str, Any]:
        """Memory-aware MedGemma inference."""
        case = mem_context.current_case
        memory_summary = self._summarize_relevant_history(mem_context.agent_memories)
        trend_summary = self._summarize_trend(mem_context.longitudinal_trend)

        result = await run_medgemma(
            case_id=case.get("case_id", ""),
            child_age_months=case.get("child_age_months", 24),
            domain=case.get("domain", "communication"),
            observations=case.get("observations", ""),
            image_b64=case.get("image_b64"),
            role=case.get("role", "chw"),
            visual_summary=None,
            temporal_descriptor=memory_summary or trend_summary or None,
        )

        current_risk = result.get("risk_level", "monitor")
        adjusted_confidence = self._adjust_confidence_from_history(
            result.get("confidence", 0.5),
            mem_context,
            current_risk,
        )

        return {
            **result,
            "confidence": adjusted_confidence,
            "used_memory": len(mem_context.agent_memories) > 0,
            "trend_aware": bool(mem_context.longitudinal_trend),
        }

    def _summarize_relevant_history(
        self, memories: List[Any]
    ) -> str:
        """Convert memory into prompt-friendly summary."""
        if not memories:
            return ""
        recent = memories[:3]
        parts = []
        for mem in recent:
            content = mem.content if hasattr(mem, "content") else mem.get("content", {})
            risk = content.get("risk_level", content.get("risk", "unknown"))
            conf = mem.confidence if hasattr(mem, "confidence") else mem.get("confidence", 0)
            parts.append(f"Prior: {risk} (confidence {conf:.1f})")
        return f"Screening history: {'; '.join(parts)}"

    def _summarize_trend(self, trend: Dict[str, Any] | None) -> str:
        """Summarize longitudinal trend for prompt."""
        if not trend or not trend.get("trends"):
            return ""
        parts = []
        for t in trend["trends"][:2]:
            risks = t.get("risk_trend", [])
            if risks:
                parts.append(f"{t.get('_id', 'agent')}: {' → '.join(str(r) for r in risks[-3:])}")
        return f"Trend: {'; '.join(parts)}" if parts else ""

    def _adjust_confidence_from_history(
        self,
        base_confidence: float,
        mem_context: MemoryAugmentedContext,
        current_risk: str,
    ) -> float:
        """Use history to calibrate confidence (conservative when inconsistent)."""
        if not mem_context.agent_memories:
            return base_confidence

        prior_risks = []
        for m in mem_context.agent_memories[:3]:
            content = m.content if hasattr(m, "content") else m.get("content", {})
            prior_risks.append(content.get("risk_level", content.get("risk", "low")))

        if prior_risks and any(p != current_risk for p in prior_risks):
            return min(base_confidence * 0.8, 0.7)
        return base_confidence
