"""
Centralized routing policies: privacy, consent, locality.
Make rules explicit so they can be tested and later made dynamic/region-specific.
"""
from typing import List

# Task type -> capability name(s) agents must advertise
TASK_TYPE_CAPABILITY = {
    "embed": ["embed"],
    "analyze_monitor": ["analyze_light", "analyze_monitor"],
    "analyze_refer": ["analyze_heavy", "analyze_refer"],
    "audit_log": ["audit"],
    "indexing": ["indexing"],
}


def capability_for(task_type: str) -> List[str]:
    """Return capability names that satisfy this task_type."""
    return TASK_TYPE_CAPABILITY.get(task_type, [task_type])


def allows_raw_media(consent: dict) -> bool:
    """True if consent permits raw image/media processing."""
    return bool(consent and consent.get("consent_given") is True)


def filter_by_consent(candidates: list, consent: dict, supports_raw_media_attr: str = "supports_raw_media") -> list:
    """
    If consent does not allow raw media, exclude agents that require raw media.
    Agents that support embeddings-only stay in the list.
    """
    if allows_raw_media(consent):
        return candidates
    return [c for c in candidates if not getattr(c, supports_raw_media_attr, False)]


def prefer_edge(candidates: list, location_attr: str = "location") -> list:
    """Sort so edge agents come first (location starting with 'edge')."""
    edge = [c for c in candidates if (getattr(c, location_attr, "") or "").startswith("edge")]
    cloud = [c for c in candidates if c not in edge]
    return edge + cloud
