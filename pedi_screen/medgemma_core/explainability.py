"""
Explainability extensions — reasoning chain, evidence extraction.
"""
from typing import Any, Dict, List


def extract_reasoning_chain(result: Dict[str, Any]) -> List[str]:
    """Extract reasoning chain from model output."""
    chain = result.get("reasoning_chain") or []
    if not chain and result.get("explain"):
        chain = [str(result["explain"])]
    return chain if isinstance(chain, list) else [str(chain)]


def extract_evidence(result: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract evidence items from model output."""
    evidence = result.get("evidence") or []
    out = []
    for e in evidence:
        if isinstance(e, dict):
            out.append({
                "type": e.get("type", "text"),
                "description": (e.get("text") or e.get("description", str(e)))[:500],
                "reference_ids": e.get("reference_ids", []),
                "influence": e.get("influence"),
            })
        else:
            out.append({"type": "text", "description": str(e)[:500], "reference_ids": []})
    return out
