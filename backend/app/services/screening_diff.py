"""
Longitudinal screening diff engine: "What changed since last screening?"
Produces FHIR Observation summaries for EHR display.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional


def diff_screenings(prev: Dict[str, Any], curr: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Compare two screening reports and return domain-level changes.

    Args:
        prev: Previous screening (risk_assessment.domains)
        curr: Current screening (risk_assessment.domains)

    Returns:
        List of {domain, from, to} for each changed domain
    """
    changes: List[Dict[str, Any]] = []

    prev_ra = prev.get("risk_assessment", {})
    curr_ra = curr.get("risk_assessment", {})

    prev_domains = prev_ra.get("domains", {})
    curr_domains = curr_ra.get("domains", {})

    all_domains = set(prev_domains.keys()) | set(curr_domains.keys())

    for domain in all_domains:
        old_val = prev_domains.get(domain)
        new_val = curr_domains.get(domain)
        if old_val != new_val:
            changes.append({
                "domain": domain,
                "from": old_val or "—",
                "to": new_val or "—",
            })

    # Overall risk change
    prev_overall = prev_ra.get("overall")
    curr_overall = curr_ra.get("overall")
    if prev_overall != curr_overall:
        changes.append({
            "domain": "overall",
            "from": prev_overall or "—",
            "to": curr_overall or "—",
        })

    return changes


def build_change_observation(
    patient_id: str,
    changes: List[Dict[str, Any]],
    effective_dt: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Build FHIR R4 Observation for "Developmental Screening Change Summary".
    EHR displays: "Language: Monitor → Improving", etc.
    """
    value_str = "; ".join(
        f"{c['domain']}: {c['from']} → {c['to']}"
        for c in changes
    )
    return {
        "resourceType": "Observation",
        "status": "final",
        "code": {"text": "Developmental Screening Change Summary"},
        "subject": {"reference": f"Patient/{patient_id}"},
        "effectiveDateTime": effective_dt or datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "valueString": value_str,
    }


def push_change_observation_to_fhir(
    fhir_base_url: str,
    access_token: str,
    patient_id: str,
    changes: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Push screening change summary as FHIR Observation to EHR.
    """
    import requests

    obs = build_change_observation(patient_id, changes)
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/fhir+json",
    }
    res = requests.post(
        f"{fhir_base_url.rstrip('/')}/Observation",
        headers=headers,
        json=obs,
        timeout=30,
    )
    res.raise_for_status()
    return res.json()
