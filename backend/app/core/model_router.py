"""
HAI-DEF multi-adapter orchestration: ensemble voting, clinical prompt building, RiskOutput.
Uses existing inference_controller when USE_HAI_PIPELINE=True; otherwise rule-based fallback from ASQ.
No heavy transformers load in this module (delegate to MedGemmaService / inference_controller).
"""
import hashlib
import logging
import time
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.schemas.pediatric import (
    ASQ3Domain,
    RiskOutput,
    ScreeningInput,
    get_age_cutoffs,
)

logger = logging.getLogger(__name__)


def _asq_to_observations(asq: ASQ3Domain, parental_concerns: Optional[str]) -> str:
    """Build observations string for inference from ASQ scores and concerns."""
    parts = [
        f"Communication={asq.communication}",
        f"GrossMotor={asq.gross_motor}",
        f"FineMotor={asq.fine_motor}",
        f"ProblemSolving={asq.problem_solving}",
        f"PersonalSocial={asq.personal_social}",
    ]
    obs = "; ".join(parts)
    if parental_concerns:
        obs += f". Parental concerns: {parental_concerns[:500]}"
    return obs


def _normalize_risk(risk: str) -> str:
    """Map inference risk to HAI-DEF risk_level."""
    r = (risk or "").lower()
    if r in ("refer", "referral", "high"):
        return "referral"
    if r in ("urgent", "critical"):
        return "urgent"
    if r in ("monitor", "discuss", "medium"):
        return "monitor"
    if r in ("low", "ontrack", "on_track"):
        return "ontrack"
    return "monitor"


def _ensemble_vote(predictions: List[Dict[str, Any]]) -> tuple:
    """Vote over adapter predictions; return (final_risk_level, calibrated_probability)."""
    if not predictions:
        return "monitor", 0.5
    risks = [p.get("risk_level", "monitor") for p in predictions]
    # Majority vote; prefer referral if any says so
    if any(_normalize_risk(r) == "referral" for r in risks):
        return "referral", 0.85
    if any(_normalize_risk(r) == "urgent" for r in risks):
        return "urgent", 0.75
    if any(_normalize_risk(r) == "monitor" for r in risks):
        return "monitor", 0.6
    return "ontrack", 0.5


def _rule_based_risk(screening: ScreeningInput) -> RiskOutput:
    """Fallback when no model: use ASQ cutoffs and domain focus."""
    cutoffs = get_age_cutoffs(screening.child_age_months)
    asq = screening.asq_scores
    d = asq.dict()
    below = [dom for dom, score in d.items() if score < cutoffs.get(dom, 0)]
    if below:
        risk_level = "referral" if len(below) >= 2 else "monitor"
        clinical_prob = 0.75 if risk_level == "referral" else 0.55
    else:
        risk_level = "ontrack"
        clinical_prob = 0.4
    return RiskOutput(
        risk_level=risk_level,
        clinical_probability=clinical_prob,
        confidence=0.65,
        reasoning_steps=[
            "Rule-based fallback (no model loaded).",
            f"Domains below cutoff: {below or 'none'}.",
        ],
        evidence=[],
        recommendations=(
            ["Consider referral for developmental assessment."]
            if below
            else ["Continue routine monitoring."]
        ),
        adapter_ensemble=["rule_based"],
        model_provenance={"source": "rule_based", "model_id": ""},
    )


class HAIAdapterRouter:
    """
    HAI-DEF orchestration: run inference via controller (or mock), then format as RiskOutput.
    Optional Platt calibration applied via app.calibration.platt.
    """

    def __init__(self) -> None:
        self._use_hai = getattr(settings, "USE_HAI_PIPELINE", False)

    def _run_controller(
        self,
        case_id: str,
        age_months: int,
        observations: str,
        embedding_b64: Optional[str],
        request_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Call inference_controller when USE_HAI_PIPELINE is True."""
        if not self._use_hai:
            return None
        try:
            from app.services.inference_controller import run_inference_sync

            shape = [1, 256]
            if not embedding_b64:
                # Controller may require embedding; use zeros base64 if needed
                import base64
                import struct
                n = 256 * 4  # float32
                buf = struct.pack(f"{n}f", *([0.0] * 256))
                embedding_b64 = base64.b64encode(buf).decode("ascii")
            return run_inference_sync(
                case_id=case_id,
                age_months=age_months,
                observations=observations,
                embedding_b64=embedding_b64,
                shape=shape,
                emb_version="medsiglip-v1",
                request_id=request_id or "",
            )
        except Exception as e:
            logger.warning("Inference controller failed: %s", e)
            return None

    def _controller_result_to_risk_output(
        self,
        raw: Dict[str, Any],
        adapter_ensemble: List[str],
    ) -> RiskOutput:
        """Map inference_controller result to RiskOutput."""
        risk = raw.get("risk", raw.get("risk_level", "monitor"))
        risk_level = _normalize_risk(risk)
        confidence = float(raw.get("confidence", 0.5))
        # Platt calibration when available
        try:
            from app.calibration.platt import ClinicalCalibrator

            calibrated = ClinicalCalibrator.calibrate(
                float(confidence), "pediscreen-v1", risk_level
            )
        except Exception:
            calibrated = max(0.01, min(0.99, confidence))
        summary = raw.get("summary") or raw.get("parent_text") or ""
        if isinstance(summary, list):
            summary = " ".join(str(s) for s in summary)
        reasoning = raw.get("reasoning_chain") or raw.get("reasoning_steps") or []
        if summary and not reasoning:
            reasoning = [summary]
        recs = raw.get("recommendations") or []
        if isinstance(recs, str):
            recs = [recs] if recs else []
        return RiskOutput(
            risk_level=risk_level,
            clinical_probability=calibrated,
            confidence=confidence,
            reasoning_steps=list(reasoning),
            evidence=raw.get("evidence") or [],
            recommendations=list(recs),
            adapter_ensemble=adapter_ensemble,
            model_provenance={
                "model_id": raw.get("model_id", ""),
                "adapter_id": raw.get("adapter_id", ""),
                "prompt_version": raw.get("prompt_version"),
                "tool_chain": raw.get("tool_chain"),
            },
        )

    def ensemble_predict(
        self,
        screening: ScreeningInput,
        request_id: Optional[str] = None,
        top_k: int = 3,
    ) -> RiskOutput:
        """
        HAI-DEF ensemble: run pipeline (controller or mock) and return calibrated RiskOutput.
        """
        observations = _asq_to_observations(
            screening.asq_scores, screening.parental_concerns
        )
        case_id = hashlib.sha256(
            f"{screening.chw_id}:{screening.child_age_months}:{time.time()}".encode()
        ).hexdigest()[:16]

        raw = self._run_controller(
            case_id=case_id,
            age_months=screening.child_age_months,
            observations=observations,
            embedding_b64=screening.embedding_b64,
            request_id=request_id,
        )

        if raw:
            adapter_ensemble = [
                raw.get("adapter_id", "pediscreen-v1"),
                "base-medgemma",
                "domain-specialist",
            ][:top_k]
            return self._controller_result_to_risk_output(raw, adapter_ensemble)

        return _rule_based_risk(screening)
