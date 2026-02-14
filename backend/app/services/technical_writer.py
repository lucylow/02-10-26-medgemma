# backend/app/services/technical_writer.py
"""Technical writing generator using MedGemma for research-grade prose, README, and slide copy."""

import re
from typing import Literal, Dict, List, Optional

from pydantic import BaseModel

from app.services.medgemma_service import MedGemmaService
from app.core.config import settings
from app.core.logger import logger
from app.core.disclaimers import DISCLAIMER_DRAFT
from app.schemas.report_template import ReportSection, Persona

WritingMode = Literal[
    "research_longform",
    "slide_deck",
    "executive_summary",
    "judge_pitch",
]

PERSONA_GUIDANCE = {
    "clinical": "Focus on workflow, safety, and interpretability.",
    "regulatory": "Emphasize CDS, human oversight, and risk mitigation.",
    "vc": "Emphasize scalability, efficiency, and adoption.",
    "technical": "Emphasize architecture and model reasoning.",
}


class TechnicalWritingRequest(BaseModel):
    product_name: str = "PediScreen AI"
    model_name: str = "MedGemma"
    target_audience: str  # judges, clinicians, engineers
    writing_mode: WritingMode
    key_points: list[str]
    constraints: list[str] = []
    word_count: int = 600
    persona: Persona = "clinical"


class TechnicalWriterService:
    """Generates research-grade technical prose using MedGemma as CDS-style writer."""

    def __init__(self, medgemma: Optional[MedGemmaService] = None):
        if medgemma is not None:
            self.model = medgemma
        else:
            # Lazy init when Vertex or HF is configured
            cfg = {
                "HF_MODEL": settings.HF_MODEL,
                "HF_API_KEY": settings.HF_API_KEY,
                "VERTEX_PROJECT": settings.VERTEX_PROJECT,
                "VERTEX_LOCATION": settings.VERTEX_LOCATION,
                "VERTEX_TEXT_ENDPOINT_ID": settings.VERTEX_TEXT_ENDPOINT_ID,
                "VERTEX_VISION_ENDPOINT_ID": settings.VERTEX_VISION_ENDPOINT_ID,
                "REDIS_URL": settings.REDIS_URL,
                "ALLOW_PHI": False,
            }
            self.model = MedGemmaService(cfg)

    async def generate(self, req: TechnicalWritingRequest) -> Dict:
        """Async variant for use in FastAPI endpoints."""
        system_prompt = self._system_prompt(req)
        user_prompt = self._user_prompt(req)

        try:
            text = await self.model.generate_text(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.2,
                max_tokens=req.word_count * 2,
            )
        except RuntimeError as e:
            if "No text model configured" in str(e):
                logger.warning("MedGemma not configured; returning placeholder content")
                text = self._placeholder_content(req)
            else:
                raise

        return {
            "mode": req.writing_mode,
            "content": text,
            "disclaimer": self._default_disclaimer(),
        }

    async def generate_structured(self, req: TechnicalWritingRequest) -> Dict:
        """Generate report with structured sections (locked vs editable)."""
        raw_result = await self.generate(req)
        raw_text = raw_result["content"]

        if req.writing_mode == "slide_deck":
            return self._slide_deck_output(raw_text, raw_result)

        # Split into paragraphs for longform; use first 2 for intro/clinical_role
        paragraphs = [p.strip() for p in raw_text.split("\n\n") if p.strip()]
        intro = paragraphs[0] if len(paragraphs) > 0 else raw_text[:500]
        clinical_role = paragraphs[1] if len(paragraphs) > 1 else (paragraphs[0][:300] if paragraphs else "")

        sections: List[ReportSection] = [
            ReportSection(id="introduction", title="Introduction", content=intro, locked=False),
            ReportSection(
                id="clinical_role",
                title="Clinical Decision Support Role",
                content=clinical_role,
                locked=False,
            ),
            ReportSection(
                id="disclaimer",
                title="Disclaimer",
                content=self._default_disclaimer(),
                locked=True,
            ),
            ReportSection(
                id="regulatory_status",
                title="Regulatory Status",
                content=self._default_regulatory_status(),
                locked=True,
            ),
        ]

        return {
            "mode": req.writing_mode,
            "sections": [s.model_dump() for s in sections],
            "version": "draft",
            "disclaimer": raw_result["disclaimer"],
        }

    def _slide_deck_output(self, raw_text: str, raw_result: Dict) -> Dict:
        """Parse slide deck mode into structured slides."""
        paragraphs = [p.strip() for p in raw_text.split("\n\n") if p.strip()]
        slide_titles = ["Problem", "Solution", "Why MedGemma", "Implementation", "Conclusion"]
        slides = []
        for i, title in enumerate(slide_titles):
            content = paragraphs[i] if i < len(paragraphs) else ""
            slides.append({"slide": title, "content": content})
        return {
            "mode": "slide_deck",
            "slides": slides,
            "version": "draft",
            "disclaimer": raw_result["disclaimer"],
        }

    def _default_regulatory_status(self) -> str:
        return (
            "This system is intended as Clinical Decision Support "
            "and is not a medical device."
        )

    def extract_citation_placeholders(self, text: str) -> List[str]:
        """Extract [REF-*] placeholders from generated text."""
        return sorted(set(re.findall(r"\[REF-[A-Z0-9-]+\]", text)))

    def _system_prompt(self, req: TechnicalWritingRequest) -> str:
        persona_guidance = PERSONA_GUIDANCE.get(req.persona, PERSONA_GUIDANCE["clinical"])
        return f"""You are a medical AI technical writer.

Rules:
- Write in a professional, research-style tone
- Do NOT claim diagnosis or autonomous decision-making
- Frame AI as Clinical Decision Support (CDS)
- Avoid regulatory claims
- Be reassuring, not promotional
- Do NOT fabricate citations. Use placeholders like [REF-CLINICAL-1], [REF-CDS-2], [REF-BURNOUT-3] instead of real references.
- Audience: {req.target_audience}
- Persona guidance: {persona_guidance}
"""

    def _user_prompt(self, req: TechnicalWritingRequest) -> str:
        bullets = "\n".join([f"- {p}" for p in req.key_points])
        constraints_list = list(req.constraints)
        if "Do NOT fabricate citations" not in str(constraints_list):
            constraints_list.append("Do NOT fabricate citations. Use placeholders like [REF-CLINICAL-1].")
        constraints = "\n".join([f"- {c}" for c in constraints_list])

        return f"""Write a {req.writing_mode.replace("_", " ")} document about:

Product: {req.product_name}
Model: {req.model_name}

Key points:
{bullets}

Constraints:
{constraints}

Include:
- Clear motivation
- Ethical framing
- Practical healthcare impact

Target length: approximately {req.word_count} words."""

    def _placeholder_content(self, req: TechnicalWritingRequest) -> str:
        """Fallback when no model is configured (dev/demo mode)."""
        bullets = "\n".join([f"- {p}" for p in req.key_points])
        return f"""[{req.product_name} — {req.writing_mode.replace("_", " ")} Draft]

Product: {req.product_name}
Model: {req.model_name}
Audience: {req.target_audience}

Key points:
{bullets}

[Configure MedGemma (Vertex or Hugging Face) to generate full content.
This is a placeholder for development/demo when no model is available.]"""

    def _default_disclaimer(self) -> str:
        return DISCLAIMER_DRAFT
