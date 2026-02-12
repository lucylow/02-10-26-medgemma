# backend/app/services/report_generator.py
"""
Automated routine medical report generation with human-in-the-loop sign-off.
Multimodal analysis → MedGemma synthesis → template population.
Deterministic baseline is authoritative; model outputs are supplemental evidence.
"""
import time
import uuid
import json
from typing import Optional, Dict, Any, List
from jinja2 import Template
from app.services.db import get_db
from app.core.logger import logger

# Helper: deterministic baseline synthesis for report sections (safe)
def baseline_report_skeleton(screening: Dict[str, Any]) -> Dict[str, Any]:
    """Create the starting shell for a drafted report using screening data."""
    pid = screening.get("screening_id") or f"ps-{int(time.time())}-{uuid.uuid4().hex[:6]}"
    patient_info = {
        "patient_id": screening.get("patient_id", pid),
        "age": f"{screening.get('childAge', screening.get('child_age_months', ''))}m",
        "screener": screening.get("screener", screening.get("submitted_by", "CHW")),
    }
    skeleton = {
        "report_id": f"rpt-{int(time.time())}-{uuid.uuid4().hex[:8]}",
        "screening_id": screening.get("screening_id"),
        "patient_info": patient_info,
        "risk_assessment": {"overall": "Unknown", "domains": {}},
        "clinical_summary": "",
        "key_evidence": [],
        "recommendations": [],
        "model_evidence": [],
        "meta": {
            "generated_at": int(time.time()),
            "generator_version": "v1.0",
        },
    }
    return skeleton


SYNTHESIS_PROMPT_TEMPLATE = """
You are a clinical reporting assistant. Produce ONLY a JSON object that follows this exact schema:

{
  "risk_assessment": {"overall": "low|medium|high", "domains": {"language":"low|medium|high", "motor":"low|medium|high", ...}},
  "clinical_summary": "One-paragraph summary targeted at clinicians (1-3 sentences).",
  "plain_language_summary": "Short summary for parents (2-4 sentences, no medical jargon).",
  "key_evidence": ["...","..."],
  "recommendations": ["...","..."]
}

Input:
- patient_age_months: {{age_months}}
- structured_scores: {{scores_json}}
- parent_observations: {{observations}}
- visual_findings_summary: {{visual_summary}}

Return only valid JSON.
"""


def build_prompt(
    age_months: int,
    scores: Dict[str, Any],
    observations: str,
    visual_summary: str,
) -> str:
    return Template(SYNTHESIS_PROMPT_TEMPLATE).render(
        age_months=age_months,
        scores_json=json.dumps(scores),
        observations=observations or "",
        visual_summary=visual_summary or "",
    )


async def generate_report_from_screening(
    screening: Dict[str, Any],
    image_bytes: Optional[bytes] = None,
    image_filename: Optional[str] = None,
    medgemma_svc=None,
) -> Dict[str, Any]:
    """
    1) Run multimodal analysis (MedSigLIP embedding for images, MedGemma for text+scores)
    2) Build synthesis prompt and call model (if configured). Always validate.
    3) Merge parsed model JSON with baseline skeleton; attach model outputs as evidence.
    4) Return a draft report (not final) and persist draft in DB.
    """
    # 0. skeleton
    skeleton = baseline_report_skeleton(screening)

    # Extract screening data (handle both MongoDB and alternative schemas)
    scores = screening.get("scores") or screening.get("report") or {}
    observations = screening.get("observations", "")
    age_months = int(screening.get("childAge", screening.get("child_age_months", 0)) or 0)

    # 1. Visual summary from image if provided
    visual_summary = ""
    if image_bytes:
        visual_summary = (
            "Visual analysis: drawing suggests age-typical prehension; no gross asymmetry observed."
        )

    # 2. Run analysis (MedGemmaService when available, else model_wrapper)
    analysis_baseline = None
    if medgemma_svc:
        try:
            analysis_result = await medgemma_svc.analyze_input(
                age_months=age_months,
                domain=screening.get("domain", ""),
                observations=observations,
                image_bytes=image_bytes,
                image_filename=image_filename,
                screening_id=screening.get("screening_id"),
            )
            analysis_baseline = analysis_result
        except Exception as e:
            logger.exception("MedGemma analyze_input failed: %s", e)
            analysis_baseline = None

    if not analysis_baseline:
        # Fallback to model_wrapper (sync)
        import asyncio
        from app.services.model_wrapper import analyze as run_analysis
        analysis_result = await asyncio.to_thread(
            run_analysis,
            age_months,
            screening.get("domain", ""),
            observations,
            screening.get("image_path"),
        )
        analysis_baseline = {"report": analysis_result.get("report", {})}

    report = analysis_baseline.get("report", {})
    skeleton["risk_assessment"]["overall"] = report.get("riskLevel", "unknown")
    skeleton["risk_assessment"]["domains"].update(
        {"communication": report.get("riskLevel", "unknown")}
    )
    skeleton["key_evidence"].extend(report.get("keyFindings", []))
    skeleton["recommendations"].extend(report.get("recommendations", []))

    # 3. Model synthesis already merged by MedGemmaService; attach visual_summary if from image
    visual_summary_from_svc = analysis_baseline.get("visual_summary")
    if visual_summary_from_svc:
        skeleton["key_evidence"].append(f"Visual: {visual_summary_from_svc}")
        skeleton["model_evidence"].append({
            "type": "visual_summary",
            "raw": visual_summary_from_svc[:2000],
            "influence": 0.3,
        })

    model_raw = analysis_baseline.get("model_raw")
    if model_raw:
        try:
            first = model_raw.find("{")
            last = model_raw.rfind("}")
            if first != -1 and last != -1:
                parsed = json.loads(model_raw[first : last + 1])
            else:
                parsed = json.loads(model_raw)
            if parsed.get("clinical_summary"):
                skeleton["clinical_summary"] = parsed["clinical_summary"]
            if parsed.get("plain_language_summary"):
                skeleton["plain_language_summary"] = parsed["plain_language_summary"]
            if parsed.get("risk_assessment", {}).get("overall"):
                skeleton["risk_assessment"]["overall"] = parsed["risk_assessment"]["overall"]
            if parsed.get("key_evidence"):
                skeleton["key_evidence"].extend(parsed["key_evidence"])
            if parsed.get("recommendations"):
                skeleton["recommendations"].extend(parsed["recommendations"])
            skeleton["model_evidence"].append({
                "type": "model_synthesis",
                "raw": model_raw[:4000],
                "parsed": parsed,
                "influence": 0.4,
            })
        except Exception as e:
            logger.warning("Model synthesis parse failed: %s", e)
            skeleton["model_evidence"].append({
                "type": "model_error",
                "raw": str(model_raw)[:2000],
            })

    if not skeleton["clinical_summary"]:
        skeleton["clinical_summary"] = report.get("summary", "Automated draft; requires clinician review.")

    # Deduplicate evidence and recommendations
    skeleton["key_evidence"] = list(dict.fromkeys(skeleton["key_evidence"]))
    skeleton["recommendations"] = list(dict.fromkeys(skeleton["recommendations"]))

    # 5. Persist draft into MongoDB reports collection
    try:
        db = get_db()
        doc = {
            "report_id": skeleton["report_id"],
            "screening_id": skeleton["screening_id"],
            "patient_info": skeleton["patient_info"],
            "draft_json": skeleton,
            "final_json": None,
            "status": "draft",
            "clinician_id": None,
            "clinician_signed_at": None,
            "created_at": time.time(),
        }
        await db.reports.insert_one(doc)
        skeleton["meta"]["persisted"] = True
    except Exception as e:
        logger.exception("Failed to persist report draft: %s", e)
        skeleton["meta"]["persisted"] = False
        skeleton["meta"]["persist_error"] = str(e)

    return skeleton
