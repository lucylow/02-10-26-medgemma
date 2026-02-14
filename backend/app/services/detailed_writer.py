# backend/app/services/detailed_writer.py
"""
MedGemma Detailed Writer — clinical-grade technical report generation.
Deterministic baseline + model evidence; schema validation; provenance tracking.
"""
import hashlib
import json
import time
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime

import httpx
from pydantic import ValidationError

from app.models.report_schema import (
    TechnicalReport,
    EvidenceItem,
    Citation,
    DomainAssessment,
)
from app.core.config import settings
from app.core.logger import logger
from app.services.phi_redactor import redact_text
from app.services.policy_engine import scan_and_rewrite

# --- prompt templates (strict JSON output) ---
GENERATION_PROMPT = """
You are MedGemma-Writer, a clinical technical writer assisting pediatric developmental screening documentation.
Return a JSON object EXACTLY matching schema keys: clinical_summary, technical_summary, parent_summary,
risk_assessment_overall, domains (array of {{domain, rating, rationale, quantitative_scores}}),
evidence (list of brief evidence items), recommendations (list), citations (list with id/text/url).

Input:
- patient_age_months: {age}
- structured_scores: {scores}
- observations: {observations}
- image_summary: {image_summary}

Return JSON ONLY. Keep technical_summary detailed (2-4 short paragraphs), create evidence bullets linking to citations where possible.
"""


def prompt_hash(text: str) -> str:
    """Hash prompt for provenance/audit."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


async def call_text_model(
    prompt: str,
    model_name: str,
    hf_api_key: str,
    max_length: int = 512,
    timeout: int = 20,
) -> Optional[str]:
    """Call Hugging Face inference API for text generation."""
    url = f"https://api-inference.huggingface.co/models/{model_name}"
    headers = {
        "Authorization": f"Bearer {hf_api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": prompt,
        "parameters": {"max_new_tokens": max_length, "temperature": 0.0},
    }
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            j = r.json()
            if isinstance(j, list) and j and "generated_text" in j[0]:
                return j[0]["generated_text"]
            if isinstance(j, dict) and "generated_text" in j:
                return j["generated_text"]
            return json.dumps(j)
    except Exception as e:
        logger.exception("Model call failed: %s", e)
        return None


async def generate_technical_report(
    screening_row: Dict[str, Any],
    age_months: int,
    scores: Dict[str, float],
    observations: str,
    image_summary: Optional[str],
    author_id: Optional[str],
    use_model: bool = True,
) -> TechnicalReport:
    """
    Generate a technical report: deterministic baseline + optional model synthesis.
    Always returns valid TechnicalReport; model output is supplemental evidence.
    """
    now = datetime.utcnow()
    report_id = f"trpt-{int(time.time())}-{uuid.uuid4().hex[:8]}"

    # 1) Baseline deterministic domain assessments
    baseline_domains: List[DomainAssessment] = []
    domain_names = ["communication", "motor", "social", "cognitive"]
    for domain_name in domain_names:
        rating = "unknown"
        rationale = "No domain-specific data."
        qs: Dict[str, float] = {}
        s = scores.get(domain_name)
        if s is not None:
            if s < 0.5:
                rating = "concern"
            elif s < 0.8:
                rating = "monitor"
            else:
                rating = "typical"
            rationale = f"Score {s:.2f} on domain {domain_name}."
            qs[domain_name] = s
        baseline_domains.append(
            DomainAssessment(
                domain=domain_name,
                rating=rating,
                rationale=rationale,
                quantitative_scores=qs,
            )
        )

    baseline_evidence: List[EvidenceItem] = [
        EvidenceItem(
            id=f"ev-{uuid.uuid4().hex[:6]}",
            type="text",
            summary=f"Structured scores: {json.dumps(scores)}",
            confidence=None,
            citations=[],
        )
    ]

    # 2) PHI redaction before any external model call
    observations_clean = observations or ""
    redaction_result = redact_text(observations_clean)
    observations_clean = redaction_result["redacted_text"]

    # 3) Build prompt and optionally call model
    prompt = GENERATION_PROMPT.format(
        age=age_months,
        scores=json.dumps(scores),
        observations=observations_clean,
        image_summary=image_summary or "",
    )
    phash = prompt_hash(prompt)

    model_parsed: Optional[Dict] = None
    model_raw: Optional[str] = None
    if use_model and settings.HF_API_KEY and settings.HF_MODEL:
        text = await call_text_model(
            prompt, settings.HF_MODEL, settings.HF_API_KEY
        )
        model_raw = text
        if text:
            try:
                first = text.find("{")
                last = text.rfind("}")
                if first != -1 and last != -1:
                    model_parsed = json.loads(text[first : last + 1])
                else:
                    model_parsed = json.loads(text)
            except Exception as e:
                logger.warning("Model output parse failed; attaching raw as evidence: %s", e)
                baseline_evidence.append(
                    EvidenceItem(
                        id=f"ev-{uuid.uuid4().hex[:6]}",
                        type="model_text",
                        summary="Model output could not be parsed to JSON; raw attached.",
                        confidence=None,
                        citations=[],
                    )
                )

    # 3) Merge: prefer model values for language, keep baseline domain ratings
    clinical_summary = ""
    technical_summary = ""
    parent_summary = ""
    risk_assessment_overall = "unknown"
    domains_list = baseline_domains
    recommendations: List[str] = []
    citations_list: List[Citation] = []

    if model_parsed:
        clinical_summary = model_parsed.get("clinical_summary", "")
        technical_summary = model_parsed.get("technical_summary", "")
        parent_summary = model_parsed.get("parent_summary", "")
        risk_assessment_overall = model_parsed.get(
            "risk_assessment_overall", risk_assessment_overall
        )
        if "domains" in model_parsed and isinstance(model_parsed["domains"], list):
            domain_by_name = {d.domain: d for d in domains_list}
            for md in model_parsed["domains"]:
                name = md.get("domain")
                d = domain_by_name.get(name)
                if d:
                    qs = dict(d.quantitative_scores or {})
                    qs.update(md.get("quantitative_scores") or {})
                    domain_by_name[name] = DomainAssessment(
                        domain=name,
                        rating=md.get("rating", d.rating),
                        rationale=md.get("rationale", d.rationale),
                        quantitative_scores=qs,
                    )
            domains_list = list(domain_by_name.values())
        recommendations = model_parsed.get("recommendations", [])
        for c in model_parsed.get("citations", []):
            cit = Citation(
                id=c.get("id", f"c-{uuid.uuid4().hex[:6]}"),
                text=c.get("text", ""),
                url=c.get("url"),
            )
            citations_list.append(cit)

        baseline_evidence.append(
            EvidenceItem(
                id=f"ev-{uuid.uuid4().hex[:6]}",
                type="model_text",
                summary="Synthesis from MedGemma model",
                confidence=None,
                citations=citations_list,
                provenance={
                    "model": settings.HF_MODEL or "unknown",
                    "prompt_hash": phash,
                    "raw_output_snippet": (model_raw or "")[:1000],
                },
            )
        )

    # 4) Policy scan: rewrite forbidden claim language in model output
    clinical_summary, _ = scan_and_rewrite(clinical_summary)
    technical_summary, _ = scan_and_rewrite(technical_summary)
    parent_summary, _ = scan_and_rewrite(parent_summary)

    # 5) Fallbacks
    clinical_summary = clinical_summary or ("Automated draft: " + observations_clean[:300])
    technical_summary = technical_summary or (
        "Technical observations: " + observations_clean[:300]
    )
    parent_summary = parent_summary or ("Summary for parent: " + observations_clean[:200])
    if not recommendations:
        recommendations = ["Monitor and refer to specialist if concerns persist."]

    # 6) Assemble and validate via Pydantic
    tr = TechnicalReport(
        report_id=report_id,
        screening_id=screening_row.get("screening_id"),
        patient_id=screening_row.get("patient_id"),
        author_id=author_id,
        created_at=now,
        updated_at=now,
        status="draft",
        clinical_summary=clinical_summary,
        technical_summary=technical_summary,
        parent_summary=parent_summary,
        risk_assessment_overall=risk_assessment_overall,
        domains=domains_list,
        evidence=baseline_evidence,
        recommendations=recommendations,
        citations=citations_list,
        metadata={"prompt_hash": phash, "model_raw": (model_raw or "")[:1000]},
    )

    return tr
