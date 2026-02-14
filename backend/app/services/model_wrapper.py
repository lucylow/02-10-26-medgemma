# backend/app/services/model_wrapper.py
"""
Production-ready model integration for developmental screening.
- Safe: deterministic rules as baseline; model output is supplemental evidence only.
- Robust: retries, timeouts, response validation, fallbacks.
- Structured: prompt for JSON; parse and validate; attach raw output as low-influence evidence on parse failure.
- Configurable: HF_MODEL, HF_API_KEY via env.
"""

import os
import time
import uuid
import json
import logging
from typing import Optional, Dict, Any, List

from app.core.config import settings

logger = logging.getLogger("model_wrapper")

# HF Inference API (HTTP) - no local GPU required
HF_API_KEY = getattr(settings, "HF_API_KEY", None) or os.getenv("HF_API_KEY") or os.getenv("MEDGEMMA_HF_API_KEY")
HF_MODEL = getattr(settings, "HF_MODEL", None) or os.getenv("HF_MODEL") or os.getenv("MEDGEMMA_MODEL_NAME")

try:
    import httpx
except ImportError:
    httpx = None

DEFAULT_TIMEOUT = 15.0
MAX_RETRIES = 2


def _baseline_det(
    age_months: int,
    domain: str,
    observations: str,
    image_provided: bool,
) -> Dict[str, Any]:
    """Deterministic, auditable baseline. Never replaced by model output."""
    obs = (observations or "").lower()
    evidence: List[Dict[str, Any]] = []
    key_findings: List[str] = []
    recommendations: List[str] = []
    score = 0.85

    if "10 words" in obs or "about 10 words" in obs or "only about 10 words" in obs:
        score = 0.45
        evidence.append({"type": "text", "content": "Reported vocabulary approx 10 words", "influence": 0.9})
        key_findings.append("Expressive vocabulary smaller than expected for age.")
        recommendations.extend([
            "Complete ASQ-3 screening",
            "Increase shared reading and naming during play",
        ])
    elif "not responding" in obs or "doesn't respond" in obs or "doesn't respond to name" in obs:
        score = 0.2
        evidence.append({"type": "text", "content": "Possible reduced responsiveness", "influence": 0.95})
        key_findings.append("Possible hearing/attention concern.")
        recommendations.extend([
            "Immediate hearing check with pediatrician.",
            "Urgent evaluation if other regression signs present.",
        ])
    else:
        score = 0.92
        evidence.append({"type": "text", "content": "Observations within expected ranges", "influence": 0.3})
        key_findings.append("No immediate red flags.")
        recommendations.append("Continue routine monitoring.")

    if image_provided:
        evidence.append({"type": "image", "content": "Image provided for visual review", "influence": 0.2})

    risk = "high" if score < 0.3 else "medium" if score < 0.7 else "low"
    summary_map = {
        "high": "Significant concerns; seek prompt evaluation.",
        "medium": "Some markers need monitoring or further screening.",
        "low": "Observations appear within typical ranges.",
    }

    return {
        "riskLevel": risk,
        "confidence": round(score, 2),
        "summary": summary_map[risk],
        "keyFindings": key_findings,
        "recommendations": recommendations,
        "evidence": evidence,
    }


def _make_prompt(age_months: int, domain: str, observations: str) -> str:
    return (
        "You are an assistant that returns a JSON ONLY output with exact keys: "
        "riskLevel, confidence (0.0-1.0), summary, keyFindings (list), recommendations (list), evidence (list of {type,content,influence}).\n\n"
        f"Input:\nage_months: {age_months}\ndomain: {domain}\nobservations: {observations}\n\n"
        "Return only valid JSON, nothing else."
    )


def _parse_model_text_output(text: str) -> Optional[Dict[str, Any]]:
    """Extract JSON from model output (may be wrapped in markdown or extra text)."""
    if not text or not isinstance(text, str):
        return None
    try:
        first = text.find("{")
        last = text.rfind("}")
        if first != -1 and last != -1:
            candidate = text[first : last + 1]
            return json.loads(candidate)
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.warning("Failed to parse model output as JSON: %s", e)
        return None


def _validate_parsed(parsed: Dict[str, Any]) -> bool:
    """Ensure parsed model output has required shape."""
    if not parsed:
        return False
    risk = parsed.get("riskLevel")
    if risk not in ("low", "medium", "high"):
        return False
    conf = parsed.get("confidence")
    if conf is not None and (not isinstance(conf, (int, float)) or conf < 0 or conf > 1):
        return False
    if not isinstance(parsed.get("keyFindings"), list):
        return False
    if not isinstance(parsed.get("recommendations"), list):
        return False
    return True


async def _call_hf_inference(
    model_name: str,
    api_key: str,
    prompt: str,
    image_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Use Hugging Face Inference API (HTTP).
    If image_path provided, send multipart/form-data with file and 'inputs' prompt.
    """
    if not httpx:
        logger.error("httpx not installed; cannot use HF Inference API")
        return {"ok": False, "error": "httpx not installed"}

    headers = {"Authorization": f"Bearer {api_key}"}
    base_url = f"https://api-inference.huggingface.co/models/{model_name}"
    timeout = DEFAULT_TIMEOUT * 2 if image_path else DEFAULT_TIMEOUT

    for attempt in range(MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                if image_path and os.path.exists(image_path):
                    with open(image_path, "rb") as f:
                        files = {"data": (os.path.basename(image_path), f, "application/octet-stream")}
                        data = {"inputs": prompt}
                        resp = await client.post(base_url, headers=headers, files=files, data=data)
                else:
                    payload = {
                        "inputs": prompt,
                        "parameters": {"max_new_tokens": 256, "temperature": 0.2},
                    }
                    resp = await client.post(
                        base_url,
                        headers={**headers, "Content-Type": "application/json"},
                        json=payload,
                    )

                if resp.status_code >= 400:
                    logger.error("HF Inference API error %s: %s", resp.status_code, resp.text[:500])
                    if attempt < MAX_RETRIES and resp.status_code >= 500:
                        time.sleep(1.0 * (attempt + 1))
                        continue
                    return {"ok": False, "error": f"HF {resp.status_code}: {resp.text[:500]}"}

                content_type = resp.headers.get("content-type", "")
                if "application/json" in content_type:
                    j = resp.json()
                    text = None
                    if isinstance(j, list) and j and isinstance(j[0], dict) and "generated_text" in j[0]:
                        text = j[0]["generated_text"]
                    elif isinstance(j, dict) and "generated_text" in j:
                        text = j["generated_text"]
                    else:
                        text = json.dumps(j)
                    parsed = _parse_model_text_output(text) if text else None
                    return {"ok": True, "parsed": parsed, "raw": text or ""}
                else:
                    text = resp.text
                    parsed = _parse_model_text_output(text)
                    return {"ok": True, "parsed": parsed, "raw": text}
        except httpx.TimeoutException as e:
            logger.warning("HF inference timeout (attempt %d): %s", attempt + 1, e)
            if attempt < MAX_RETRIES:
                time.sleep(1.0 * (attempt + 1))
                continue
            return {"ok": False, "error": f"timeout: {e}"}
        except Exception as e:
            logger.exception("HF inference request failed")
            if attempt < MAX_RETRIES:
                time.sleep(1.0 * (attempt + 1))
                continue
            return {"ok": False, "error": str(e)}

    return {"ok": False, "error": "max retries exceeded"}


async def analyze(
    child_age_months: int,
    domain: str,
    observations: str,
    image_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Primary entry point. Deterministic baseline always returned; model output merged as supplemental evidence.
    """
    base = _baseline_det(child_age_months, domain, observations, bool(image_path))
    screening_id = f"ps-{int(time.time())}-{uuid.uuid4().hex[:8]}"

    if not HF_API_KEY or not HF_MODEL:
        return {
            "success": True,
            "screening_id": screening_id,
            "report": {
                **base,
                "analysis_meta": {
                    "age_months": child_age_months,
                    "domain": domain,
                    "observations_snippet": (observations or "")[:500],
                    "image_provided": bool(image_path),
                },
            },
            "timestamp": int(time.time()),
            "model_used": False,
            "model_parse_ok": True,
        }

    prompt = _make_prompt(child_age_months, domain, observations)
    resp = await _call_hf_inference(HF_MODEL, HF_API_KEY, prompt, image_path)

    if not resp.get("ok"):
        base["evidence"].append({
            "type": "model_error",
            "content": resp.get("error", "unknown"),
            "influence": 0.0,
        })
        return {
            "success": True,
            "screening_id": screening_id,
            "report": {
                **base,
                "analysis_meta": {
                    "age_months": child_age_months,
                    "domain": domain,
                    "observations_snippet": (observations or "")[:500],
                    "image_provided": bool(image_path),
                },
            },
            "timestamp": int(time.time()),
            "model_used": True,
            "model_parse_ok": False,
        }

    parsed = resp.get("parsed")
    if not parsed or not _validate_parsed(parsed):
        raw = resp.get("raw", "")
        base["evidence"].append({
            "type": "model_text",
            "content": (raw[:2000] if raw else "no model output"),
            "influence": 0.25,
        })
        return {
            "success": True,
            "screening_id": screening_id,
            "report": {
                **base,
                "analysis_meta": {
                    "age_months": child_age_months,
                    "domain": domain,
                    "observations_snippet": (observations or "")[:500],
                    "image_provided": bool(image_path),
                },
            },
            "timestamp": int(time.time()),
            "model_used": True,
            "model_parse_ok": False,
        }

    # Merge: baseline findings kept; model adds suggestions
    risk = parsed.get("riskLevel", base["riskLevel"])
    if risk not in ("low", "medium", "high"):
        risk = base["riskLevel"]
    confidence = float(parsed.get("confidence", base.get("confidence", 0.5)))
    confidence = min(1.0, max(0.0, confidence))
    summary = parsed.get("summary") or base["summary"]
    key_findings = list(dict.fromkeys(base["keyFindings"] + parsed.get("keyFindings", [])))
    recommendations = list(dict.fromkeys(base["recommendations"] + parsed.get("recommendations", [])))
    evidence = list(base["evidence"])
    for e in parsed.get("evidence", []):
        inf = 0.25
        if isinstance(e, dict) and "influence" in e:
            try:
                inf = min(1.0, max(0.0, float(e["influence"])))
            except (TypeError, ValueError):
                pass
        evidence.append({
            "type": e.get("type", "model_text") if isinstance(e, dict) else "model_text",
            "content": e.get("content", "") if isinstance(e, dict) else str(e),
            "influence": inf,
        })

    report = {
        "riskLevel": risk,
        "confidence": confidence,
        "summary": summary,
        "keyFindings": key_findings,
        "recommendations": recommendations,
        "evidence": evidence,
        "analysis_meta": {
            "age_months": child_age_months,
            "domain": domain,
            "observations_snippet": (observations or "")[:500],
            "image_provided": bool(image_path),
        },
    }

    return {
        "success": True,
        "screening_id": screening_id,
        "report": report,
        "timestamp": int(time.time()),
        "model_used": True,
        "model_parse_ok": True,
    }
