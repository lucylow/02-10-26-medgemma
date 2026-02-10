from .base import BaseAgent
from .schemas import AgentContext, SafetyCheckResult

BANNED_TERMS = [
    "diagnosis",
    "disorder",
    "autism",
    "disease",
    "definitive",
]

class SafetyAgent(BaseAgent):
    name = "safety_agent"

    def run(self, ctx: AgentContext) -> AgentContext:
        issues = []

        text_blob = ""
        if ctx.screening:
            text_blob += " ".join(ctx.screening.findings)
            text_blob += " " + ctx.screening.rationale

        for term in BANNED_TERMS:
            if term.lower() in text_blob.lower():
                issues.append(f"Banned term detected: {term}")

        if ctx.screening and ctx.screening.risk_level == "elevated":
            issues.append("Elevated risk requires clinician review")

        if issues:
            ctx.flags.append("safety_review_required")

        ctx.flags.extend(issues)
        return ctx
