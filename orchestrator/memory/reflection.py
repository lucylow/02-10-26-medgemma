"""
Reflection Manager: agent self-critique and action determination.
"""
import json
import logging
from typing import Any, Dict

from orchestrator.schemas import ReflectionLog
from orchestrator.memory.memory_manager import MemoryManager

logger = logging.getLogger("orchestrator.reflection")


def _truncate_json(obj: Any, max_len: int = 200) -> str:
    """Serialize and truncate for storage."""
    try:
        s = json.dumps(obj, default=str)
        return s[:max_len] + ("..." if len(s) > max_len else "")
    except Exception:
        return str(obj)[:max_len]


class ReflectionManager:
    """Manages agent self-reflection and critique."""

    def __init__(self, memory_manager: MemoryManager):
        self.memory = memory_manager
        self.self_critique_prompts = {
            "medgemma": """Review your screening output. Critique:
1. Is risk level conservative? (prefer false positive over false negative)
2. Does language avoid diagnosis? (screening/CDS only)
3. Are next_steps actionable for CHW/parent?
4. Confidence appropriate for evidence?

Output JSON: {"critique": "...", "action": "adjust_confidence|retry|escalate|proceed"}""",
            "safety": """Did you correctly identify all safety violations?
- Forbidden diagnoses? ✓
- CDS-only language? ✓
- Schema compliance? ✓

Be extra conservative. Better block 10 safe outputs than miss 1 unsafe.""",
        }

    async def reflect_on_output(
        self,
        case_id: str,
        agent_name: str,
        input_data: Dict[str, Any],
        output_data: Dict[str, Any],
        success: bool,
    ) -> ReflectionLog:
        """Agent self-critiques its own output."""
        critique = await self._generate_critique(agent_name, input_data, output_data)
        action = self._determine_action(critique, success, output_data)
        confidence_change = self._confidence_adjustment(critique)

        reflection = ReflectionLog(
            case_id=case_id,
            agent_name=agent_name,
            reflection_type="self_critique",
            input_summary=_truncate_json(input_data),
            output_summary=_truncate_json(output_data),
            critique=critique,
            confidence_change=confidence_change,
            action_taken=action,
        )

        await self.memory.store_reflection(reflection)
        return reflection

    async def _generate_critique(
        self, agent_name: str, input_data: Dict, output_data: Dict
    ) -> str:
        """Generate critique based on agent type (mock — replace with LLM call)."""
        critique_parts = []

        if agent_name == "medgemma":
            risk = output_data.get("risk_level", output_data.get("risk", "low"))
            confidence = output_data.get("confidence", 0.5)
            if risk in ["refer", "discuss", "elevated"] and confidence < 0.7:
                critique_parts.append("High-risk output lacks sufficient confidence")

            next_steps = output_data.get("next_steps", output_data.get("recommendations", []))
            if next_steps and "monitor" not in str(next_steps).lower():
                pass  # Not necessarily missing
            elif not next_steps:
                critique_parts.append("Missing actionable recommendations")

        elif agent_name == "safety":
            if not output_data.get("ok", True) and "error" in str(output_data).lower():
                critique_parts.append("Failed to catch safety violation")

        return "; ".join(critique_parts) or "Output appears clinically appropriate"

    def _determine_action(
        self, critique: str, success: bool, output: Dict[str, Any]
    ) -> str:
        """Reflection → Action mapping."""
        if "lacks sufficient confidence" in critique:
            return "adjust_confidence"
        if "safety violation" in critique:
            return "escalate"
        if success:
            return "proceed"
        return "retry"

    def _confidence_adjustment(self, critique: str) -> float:
        """How much did this reflection affect next prediction confidence."""
        if "lacks sufficient confidence" in critique:
            return -0.1
        if "safety violation" in critique:
            return -0.2
        if "clinically appropriate" in critique:
            return 0.0
        return 0.0
