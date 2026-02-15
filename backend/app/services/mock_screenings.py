"""
Mock screening data for demo mode. 10–20 prebuilt cases covering:
- Ages: 18–60 months
- Domains: communication, motor, social, cognitive
- Risk mix: on_track, monitor, discuss, refer
- Longitudinal patterns: improving, stable, worsening
"""
from typing import Dict, List, Any

MOCK_CASES: List[Dict[str, Any]] = [
    {
        "case_id": "mock-001",
        "child_age_months": 24,
        "domain": "communication",
        "risk_level": "on_track",
        "observations": "Uses about 50 words, combines two words, points to pictures in books.",
        "clinician_summary": "Expressive language within expected range for 24 months.",
        "parent_summary": "What you shared suggests your child is developing language skills as expected.",
        "rationale": ["Vocabulary size typical for age.", "Two-word combinations emerging."],
        "recommendations": ["Continue shared reading.", "Narrate daily activities."],
    },
    {
        "case_id": "mock-002",
        "child_age_months": 18,
        "domain": "motor",
        "risk_level": "monitor",
        "observations": "Walks with support but not independently. Prefers crawling.",
        "clinician_summary": "Gross motor development slightly delayed; independent walking not yet achieved.",
        "parent_summary": "Your child is making progress with walking. Some children take a bit longer.",
        "rationale": ["Independent walking expected by 18 months.", "Crawling preference noted."],
        "recommendations": ["Encourage supported walking practice.", "Reassess in 2 months."],
    },
    {
        "case_id": "mock-003",
        "child_age_months": 36,
        "domain": "social",
        "risk_level": "on_track",
        "observations": "Plays alongside other children, shares toys sometimes, shows empathy when sibling cries.",
        "clinician_summary": "Social-emotional development within expected range.",
        "parent_summary": "Your child shows age-appropriate social skills and caring behavior.",
        "rationale": ["Parallel play typical.", "Empathy emerging."],
        "recommendations": ["Continue playgroup exposure.", "Model sharing and turn-taking."],
    },
    {
        "case_id": "mock-004",
        "child_age_months": 30,
        "domain": "communication",
        "risk_level": "discuss",
        "observations": "Few words, mostly points and gestures. Does not respond consistently to name.",
        "clinician_summary": "Limited expressive language and possible attention/hearing concern.",
        "parent_summary": "We noticed some patterns that are worth discussing with a clinician soon.",
        "rationale": ["Vocabulary below expected.", "Inconsistent name response."],
        "recommendations": ["Hearing evaluation recommended.", "Formal speech-language screening."],
    },
    {
        "case_id": "mock-005",
        "child_age_months": 48,
        "domain": "cognitive",
        "risk_level": "on_track",
        "observations": "Counts to 10, names colors, sorts objects by shape.",
        "clinician_summary": "Cognitive skills within expected range for age.",
        "parent_summary": "Your child is showing strong problem-solving and learning skills.",
        "rationale": ["Counting and sorting typical.", "Color naming present."],
        "recommendations": ["Continue age-appropriate puzzles.", "Introduce simple board games."],
    },
    {
        "case_id": "mock-006",
        "child_age_months": 24,
        "domain": "social",
        "risk_level": "monitor",
        "observations": "Limited eye contact during play. Prefers solitary play.",
        "clinician_summary": "Social engagement patterns warrant monitoring.",
        "parent_summary": "Some children prefer quieter play. We suggest monitoring and follow-up.",
        "rationale": ["Eye contact variable.", "Solitary preference noted."],
        "recommendations": ["Structured social play opportunities.", "Reassess in 3 months."],
    },
    {
        "case_id": "mock-007",
        "child_age_months": 60,
        "domain": "communication",
        "risk_level": "refer",
        "observations": "Uses short phrases only. Difficulty with pronouns. Not yet using complex sentences.",
        "clinician_summary": "Expressive language significantly below expected for 5 years.",
        "parent_summary": "We recommend speaking with a specialist soon to explore next steps.",
        "rationale": ["Sentence complexity below age.", "Pronoun use delayed."],
        "recommendations": ["Urgent speech-language evaluation.", "Early intervention referral."],
    },
    {
        "case_id": "mock-008",
        "child_age_months": 18,
        "domain": "cognitive",
        "risk_level": "on_track",
        "observations": "Stacks 3 blocks, finds hidden toy, imitates household tasks.",
        "clinician_summary": "Problem-solving and imitation within expected range.",
        "parent_summary": "Your child is learning through play and imitation as expected.",
        "rationale": ["Block stacking typical.", "Object permanence demonstrated."],
        "recommendations": ["Continue cause-effect play.", "Simple hide-and-seek games."],
    },
    {
        "case_id": "mock-009",
        "child_age_months": 36,
        "domain": "motor",
        "risk_level": "on_track",
        "observations": "Pedals tricycle, draws circles, uses spoon well.",
        "clinician_summary": "Fine and gross motor skills within expected range.",
        "parent_summary": "Your child's motor skills are developing well.",
        "rationale": ["Tricycle use typical.", "Circle drawing present."],
        "recommendations": ["Outdoor play for gross motor.", "Drawing and coloring activities."],
    },
    {
        "case_id": "mock-010",
        "child_age_months": 42,
        "domain": "communication",
        "risk_level": "monitor",
        "observations": "Speaks in 3–4 word sentences. Some sound substitutions. Understands stories.",
        "clinician_summary": "Language generally on track; minor articulation variations.",
        "parent_summary": "Your child is communicating well. Some sound differences are common.",
        "rationale": ["Sentence length adequate.", "Receptive language strong."],
        "recommendations": ["Monitor speech clarity.", "Reassess in 6 months if concerns persist."],
    },
]


def get_mock_case_by_observations(observations: str, age: int, domain: str) -> Dict[str, Any] | None:
    """Find a mock case that best matches the input. Returns None if no good match."""
    obs_lower = (observations or "").lower()
    for c in MOCK_CASES:
        if c["child_age_months"] == age and c["domain"] == domain:
            if any(w in obs_lower for w in c["observations"].lower().split()[:5]):
                return c
    return None


def get_mock_case_by_id(case_id: str) -> Dict[str, Any] | None:
    """Get mock case by case_id."""
    for c in MOCK_CASES:
        if c["case_id"] == case_id:
            return c
    return None


def list_mock_cases(limit: int = 20) -> List[Dict[str, Any]]:
    """List mock cases for CHW dashboard."""
    return MOCK_CASES[:limit]
