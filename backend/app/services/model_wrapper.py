# backend/app/services/model_wrapper.py
import os
import time
import uuid
from typing import Optional, Dict, Any, List
from app.core.config import settings

# Optional: import HF/transformers only when enabled
USE_HF = settings.MEDGEMMA_MODE and bool(settings.MEDGEMMA_MODEL_NAME)

if USE_HF:
    try:
        from transformers import pipeline
        hf_pipe = pipeline("text2text-generation", model=settings.MEDGEMMA_MODEL_NAME)
    except Exception as e:
        hf_pipe = None
else:
    hf_pipe = None

def _deterministic_simulation(age_months: int, domain: str, observations: str, image_path: Optional[str]) -> Dict[str, Any]:
    """
    Deterministic, auditable simulation for demos/tests.
    Avoid hallucinations and always return structured lists.
    """
    obs = (observations or "").lower()
    evidence: List[Dict[str, Any]] = []
    key_findings: List[str] = []
    recommendations: List[str] = []
    score = 0.8

    # simplified heuristics used widely in demos
    if "10 words" in obs or "about 10 words" in obs or "only about 10 words" in obs:
        score = 0.45
        evidence.append({"type": "text", "content": "Reported vocabulary ~10 words", "influence": 0.9})
        key_findings.append("Expressive vocabulary below expected for age.")
        recommendations.extend([
            "Complete a standardized language screen (ASQ/M-CHAT)",
            "Increase shared reading and naming during play",
            "Consider referral to speech-language pathology if no improvement"
        ])
    elif "not responding" in obs or "doesn't respond to name" in obs:
        score = 0.2
        evidence.append({"type": "text", "content": "Possible reduced responsiveness to auditory cues", "influence": 0.95})
        key_findings.append("Possible hearing or social-attention concern.")
        recommendations.extend([
            "Immediate primary care/hearing check",
            "Urgent evaluation if other concerning signs present"
        ])
    else:
        score = 0.9
        evidence.append({"type": "text", "content": "No clear red flags in text input", "influence": 0.4})
        key_findings.append("No immediate red flags from provided description.")
        recommendations.extend([
            "Continue routine monitoring and age-appropriate stimulation",
            "Re-screen if new concerns arise"
        ])

    if image_path:
        evidence.append({"type": "image", "content": "Image provided for optional visual analysis", "influence": 0.2})

    # risk mapping
    if score < 0.3:
        risk = "high"
    elif score < 0.7:
        risk = "medium"
    else:
        risk = "low"

    summary_map = {
        "high": "Screening suggests significant concerns. Please seek prompt clinical evaluation.",
        "medium": "Some markers of concern. Monitoring and follow-up or formal screening recommended.",
        "low": "Observations are within typical ranges; continue routine monitoring."
    }

    return {
        "success": True,
        "screening_id": f"ps-{int(time.time())}-{uuid.uuid4().hex[:8]}",
        "report": {
            "riskLevel": risk,
            "confidence": round(float(score), 2),
            "summary": summary_map[risk],
            "keyFindings": key_findings,
            "recommendations": recommendations,
            "evidence": evidence,
            "analysis_meta": {
                "age_months": age_months,
                "domain": domain,
                "observations_snippet": observations[:500],
                "image_provided": bool(image_path)
            }
        },
        "timestamp": int(time.time())
    }

def analyze(child_age_months: int, domain: str, observations: str, image_path: Optional[str]) -> Dict[str, Any]:
    """
    Primary entry point used by endpoints. If HF model is configured and available, run
    a controlled prompt and attach model output as supplementary evidence only.
    """
    base_report = _deterministic_simulation(child_age_months, domain, observations, image_path)

    if hf_pipe:
        try:
            prompt = f"Age: {child_age_months} months\nDomain: {domain}\nObservations: {observations}\n\nProduce a concise structured summary: risk, summary sentence, 2 recommendations (bullet list)."
            res = hf_pipe(prompt, max_length=256, truncation=True)
            model_text = res[0].get("generated_text", "") if isinstance(res, list) else str(res)
            # attach as model evidence (low influence) — do not replace deterministic outputs
            base_report["report"]["evidence"].append({"type": "model_text", "content": model_text, "influence": 0.25})
        except Exception as e:
            # fail-safe: do not let model errors crash service
            base_report["report"]["evidence"].append({"type": "error", "content": "model_inference_failed", "influence": 0.0})
    return base_report
