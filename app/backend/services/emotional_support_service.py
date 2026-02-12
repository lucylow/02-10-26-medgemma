# app/backend/services/emotional_support_service.py
"""
Emotional tone adaptation for pediatric screening results.
Adapts communication based on detected user sentiment.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional


class UserTone(Enum):
    ANXIOUS = "anxious"
    FACTUAL = "factual"
    CONFUSED = "confused"
    URGENT = "urgent"


class SupportLevel(Enum):
    REASSURING = "reassuring"
    DIRECT = "direct"
    EXPLANATORY = "explanatory"
    URGENT_CARE = "urgent_care"


@dataclass
class ToneAnalysis:
    tone: UserTone
    confidence: float
    keywords: List[str]
    suggested_support: SupportLevel


class EmotionalSupportService:
    """
    Analyzes user input and adapts communication tone.
    """

    def __init__(self) -> None:
        self.tone_patterns = {
            UserTone.ANXIOUS: [
                r"worried|concerned|anxious|scared|nervous|frustrated",
                r"not sure what to do|don't know|helpless",
                r"!\s*!",
            ],
            UserTone.URGENT: [
                r"immediately|right now|asap|urgent|emergency",
                r"very worried|extremely concerned",
                r"not responding|can't breathe|danger",
            ],
            UserTone.CONFUSED: [
                r"confused|don't understand|what does this mean",
                r"not normal|different from|unusual",
                r"\?",
            ],
            UserTone.FACTUAL: [
                r"observed|noticed|typically|usually",
                r"milestone|development|behavior",
                r"age.*months|years old",
            ],
        }

        self.response_templates = {
            SupportLevel.REASSURING: {
                "opening": "We understand this can be worrying. Let's look at this together step by step.",
                "closing": "Many children develop at their own pace. You're taking the right step by being proactive.",
                "tone": "calm, patient, supportive",
            },
            SupportLevel.DIRECT: {
                "opening": "Thank you for the clear observations. Here's our analysis:",
                "closing": "Based on what you've shared, here are the specific next steps.",
                "tone": "clear, concise, actionable",
            },
            SupportLevel.EXPLANATORY: {
                "opening": "Let's break this down together. Here's what this might mean:",
                "closing": "Every child is unique. Here are some resources to learn more.",
                "tone": "educational, thorough, patient",
            },
            SupportLevel.URGENT_CARE: {
                "opening": "Thank you for sharing this important concern.",
                "closing": "Please connect with a healthcare provider promptly for immediate guidance.",
                "tone": "serious, clear, action-oriented",
            },
        }

    def analyze_user_tone(self, user_input: str) -> ToneAnalysis:
        """Analyze text for emotional tone using pattern matching."""
        tone_scores: Dict[UserTone, float] = {}
        detected_keywords: List[str] = []

        user_lower = user_input.lower()

        for tone, patterns in self.tone_patterns.items():
            score = 0.0
            for pattern in patterns:
                matches = re.findall(pattern, user_lower, re.IGNORECASE)
                if matches:
                    score += len(matches) * 0.3
                    detected_keywords.extend(matches[:3])

            tone_scores[tone] = min(score, 1.0)

        primary_tone = max(tone_scores.items(), key=lambda x: x[1])
        confidence = primary_tone[1] if primary_tone[1] > 0 else 0.5

        support_mapping = {
            UserTone.ANXIOUS: SupportLevel.REASSURING,
            UserTone.FACTUAL: SupportLevel.DIRECT,
            UserTone.CONFUSED: SupportLevel.EXPLANATORY,
            UserTone.URGENT: SupportLevel.URGENT_CARE,
        }

        return ToneAnalysis(
            tone=primary_tone[0],
            confidence=confidence,
            keywords=list(set(detected_keywords))[:5],
            suggested_support=support_mapping.get(primary_tone[0], SupportLevel.DIRECT),
        )

    def adapt_clinical_result(
        self,
        clinical_result: Dict[str, Any],
        tone_analysis: ToneAnalysis,
    ) -> Dict[str, Any]:
        """Adapt clinical results based on user tone."""
        template = self.response_templates[tone_analysis.suggested_support]

        risk_assessment = clinical_result.get("risk_assessment", {})
        risk_level = risk_assessment.get("level", "unknown") if isinstance(risk_assessment, dict) else "unknown"

        risk_communication = self._adapt_risk_communication(
            risk_level, tone_analysis.suggested_support
        )

        adapted_recommendations = self._adapt_recommendations(
            clinical_result.get("recommendations", []), tone_analysis.suggested_support
        )

        return {
            **clinical_result,
            "emotional_context": {
                "detected_tone": tone_analysis.tone.value,
                "support_approach": tone_analysis.suggested_support.value,
                "communication_style": template["tone"],
            },
            "adapted_communication": {
                "opening_statement": template["opening"],
                "risk_explanation": risk_communication,
                "closing_statement": template["closing"],
            },
            "recommendations": adapted_recommendations,
            "support_resources": self._get_support_resources(tone_analysis.tone),
        }

    def _adapt_risk_communication(
        self, risk_level: str, support_level: SupportLevel
    ) -> str:
        """Adapt risk explanation based on support needs."""
        explanations: Dict[str, Dict[SupportLevel, str]] = {
            "high": {
                SupportLevel.REASSURING: "Our analysis suggests it would be valuable to discuss this with a specialist soon. Many families find early guidance helpful.",
                SupportLevel.DIRECT: "Our assessment indicates a higher likelihood of developmental delay. Consultation with a specialist is recommended.",
                SupportLevel.URGENT_CARE: "Our analysis identifies significant concerns that warrant prompt evaluation by a healthcare provider.",
            },
            "medium": {
                SupportLevel.REASSURING: "Our analysis shows some areas to keep an eye on. Many children catch up with a little extra support.",
                SupportLevel.EXPLANATORY: "We've identified a few developmental markers that are slightly delayed. Here's what this typically means...",
                SupportLevel.DIRECT: "Some developmental concerns were noted. Monitoring and possible assessment are suggested.",
            },
            "low": {
                SupportLevel.REASSURING: "Our analysis is reassuring - what you're seeing appears typical for this age.",
                SupportLevel.DIRECT: "Development appears on track based on current observations.",
                SupportLevel.EXPLANATORY: "The behaviors you described align with expected developmental patterns for this age.",
            },
        }

        level_explanations = explanations.get(risk_level, {})
        return level_explanations.get(
            support_level,
            "Our analysis is complete. Please review the results below.",
        )

    def _adapt_recommendations(
        self,
        recommendations: List[str],
        support_level: SupportLevel,
    ) -> List[Dict[str, Any]]:
        """Structure recommendations with emotional support."""
        adapted = []
        for i, rec in enumerate(recommendations):
            priority = "high" if i == 0 else "medium"

            if support_level == SupportLevel.REASSURING:
                prefix = "Consider "
                framing = "Many families find this helpful"
            elif support_level == SupportLevel.URGENT_CARE:
                prefix = "Schedule "
                framing = "Important for next steps"
            else:
                prefix = ""
                framing = "Recommended action"

            adapted.append({
                "action": f"{prefix}{rec}",
                "priority": priority,
                "framing": framing,
                "emotional_context": support_level.value,
            })

        return adapted

    def _get_support_resources(self, tone: UserTone) -> List[Dict[str, str]]:
        """Get tone-specific support resources."""
        base_resources = [
            {
                "title": "CDC Developmental Milestones",
                "url": "https://www.cdc.gov/ncbddd/actearly/milestones/index.html",
                "type": "educational",
            },
            {"title": "Early Intervention Directory", "url": "#local-resources", "type": "practical"},
        ]

        tone_resources: Dict[UserTone, List[Dict[str, str]]] = {
            UserTone.ANXIOUS: [
                {"title": "Parent Support Groups", "url": "#support-groups", "type": "emotional"},
                {"title": "Understanding Developmental Variation", "url": "#variation-guide", "type": "educational"},
            ],
            UserTone.CONFUSED: [
                {"title": "Developmental Glossary", "url": "#glossary", "type": "educational"},
                {"title": "FAQ: Common Concerns", "url": "#faq", "type": "educational"},
            ],
            UserTone.URGENT: [
                {"title": "24/7 Nurse Line", "url": "tel:+18005551234", "type": "urgent"},
                {"title": "Find Local Specialists", "url": "#specialists", "type": "practical"},
            ],
        }

        return base_resources + tone_resources.get(tone, [])
