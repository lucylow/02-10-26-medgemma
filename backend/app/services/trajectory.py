"""
Trajectory analysis using stored MedSigLIP embeddings and risk scores.
Answers: "Is development improving, plateauing, or regressing?"
"""
import numpy as np
from typing import List, Dict, Any, Optional

from app.services.db import get_db
from app.core.logger import logger


def cosine(a: List[float], b: List[float]) -> float:
    """Cosine similarity between two embedding vectors."""
    a_arr = np.array(a, dtype=float)
    b_arr = np.array(b, dtype=float)
    norm_a = np.linalg.norm(a_arr)
    norm_b = np.linalg.norm(b_arr)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a_arr, b_arr) / (norm_a * norm_b))


def classify_trajectory(similarities: List[float], risk_scores: List[int]) -> str:
    """
    Classify developmental trajectory from embedding similarities and risk scores.
    - similarity ↑ and risk ↓ → improving
    - similarity ≈ flat and risk ≈ flat → plateauing
    - similarity ↓ or risk ↑ → concerning
    """
    if len(similarities) < 2:
        return "insufficient_data"

    sim_trend = float(np.polyfit(range(len(similarities)), similarities, 1)[0])
    risk_trend = float(np.polyfit(range(len(risk_scores)), risk_scores, 1)[0])

    if sim_trend > 0.02 and risk_trend < -0.1:
        return "improving"
    if abs(sim_trend) < 0.01 and abs(risk_trend) < 0.05:
        return "plateauing"
    return "concerning"


def _risk_to_score(risk: Any) -> int:
    """Map risk level string to numeric score (low=0, medium=1, high=2)."""
    if risk is None:
        return 1
    s = str(risk).lower()
    return {"low": 0, "medium": 1, "high": 2, "on_track": 0, "monitor": 1, "refer": 2}.get(s, 1)


async def compute_trajectory(
    patient_id: str,
    domain: str = "communication",
) -> Dict[str, Any]:
    """
    Compute developmental trajectory for a patient and domain.
    Uses MongoDB: joins image_embeddings with reports by report_id.
    """
    db = get_db()

    # Find reports for this patient (patient_info.patient_id or screening_id fallback)
    reports_cursor = db.reports.find(
        {"$or": [
            {"patient_info.patient_id": patient_id},
            {"screening_id": patient_id},
        ]}
    ).sort("created_at", 1)

    report_docs = []
    async for doc in reports_cursor:
        report_docs.append(doc)

    if len(report_docs) < 2:
        return {
            "trajectory": "insufficient_data",
            "message": "At least 2 screenings required for trajectory analysis",
        }

    report_ids = [r["report_id"] for r in report_docs]

    # Fetch embeddings for these reports (supports list or embedding_b64+shape)
    from app.services.embedding_store import _embedding_from_doc

    report_id_to_emb = {}
    async for emb in db.image_embeddings.find({"report_id": {"$in": report_ids}}):
        vec = _embedding_from_doc(emb)
        if vec:
            report_id_to_emb[emb["report_id"]] = vec

    # Build aligned lists: only include reports that have embeddings, ordered by created_at
    embeddings = []
    risks = []
    for doc in report_docs:
        emb = report_id_to_emb.get(doc["report_id"])
        if not emb:
            continue
        rpt = doc.get("final_json") or doc.get("draft_json") or {}
        if isinstance(rpt, dict) and "draft_json" in rpt:
            rpt = rpt.get("draft_json", rpt)
        risk_assessment = rpt.get("risk_assessment", {})
        domains = risk_assessment.get("domains", {})
        overall = risk_assessment.get("overall", "medium")
        domain_risk = domains.get(domain, overall)
        embeddings.append(emb)
        risks.append(_risk_to_score(domain_risk))

    if len(embeddings) < 2:
        return {
            "trajectory": "insufficient_data",
            "message": "At least 2 image embeddings required for trajectory analysis",
        }

    # Compute consecutive cosine similarities
    similarities = [
        cosine(embeddings[i], embeddings[i + 1])
        for i in range(len(embeddings) - 1)
    ]

    trajectory = classify_trajectory(similarities, risks)

    interpretation = {
        "improving": "Skills show consistent developmental gains.",
        "plateauing": "Skills appear stable; continued monitoring recommended.",
        "concerning": "Progress may be limited; further evaluation advised.",
        "insufficient_data": "Insufficient data for trajectory analysis.",
    }.get(trajectory, "")

    return {
        "trajectory": trajectory,
        "interpretation": interpretation,
        "similarities": similarities,
        "risk_scores": risks,
        "n_screenings": len(report_docs),
    }
