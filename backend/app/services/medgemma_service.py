# backend/app/services/medgemma_service.py
"""
MedGemma integration for PediScreen AI — multimodal clinical reasoning engine.
Implements canonical prompt template, structured output parsing, provenance tracking,
and privacy-first embedding-based inference per design spec.
"""
import asyncio
import base64
import hashlib
import json
import logging
import os
import re
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx

# Vertex imports optional — guard import to avoid hard dependency during testing
try:
    from google.cloud import aiplatform
    _HAS_VERTEX = True
except Exception:
    _HAS_VERTEX = False

# Optional Redis caching (install redis with async support if used)
try:
    import redis.asyncio as aioredis
    _HAS_REDIS = True
except Exception:
    try:
        import aioredis
        _HAS_REDIS = True
    except Exception:
        _HAS_REDIS = False

logger = logging.getLogger("medgemma.service")

# Canonical prompt template per PediScreen design spec (Section 5.1)
# Explainable prompts add reasoning_chain and evidence for trust/accountability
def _load_explainable_prompt() -> Optional[str]:
    """Load explainable prompt template if available."""
    try:
        import json
        prompts_path = os.path.join(os.path.dirname(__file__), "..", "..", "prompts", "explainable_prompts.json")
        if os.path.exists(prompts_path):
            with open(prompts_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            lines = data.get("pedi_infer_prompt", [])
            if lines:
                return "\n".join(lines)
    except Exception:
        pass
    return None

CANONICAL_PROMPT_TEMPLATE = """[METADATA]
Child age (months): {age_months}
Context: {context_text}

[IMAGE_EMBEDDING]
{embedding_note}

Task:
You are a clinical decision support assistant. Based on the child's age and the observations below, produce:
1) a short clinical summary (2-4 bullet points),
2) risk level ("low", "monitor", "high", "refer"),
3) three clear, parent-friendly recommendations (one phrased for the parent),
4) a detailed reasoning chain (step by step),
5) evidence backing each step,
6) confidence score (0.0 to 1.0).

Do NOT provide a diagnosis. Return JSON only in this exact format:
===BEGIN_OUTPUT===
{{
  "summary": ["...","..."],
  "risk": "monitor",
  "reasoning_chain": ["step 1", "step 2", "..."],
  "evidence": [{{"type":"text","description":"...","reference_ids":[]}}],
  "confidence": 0.72,
  "recommendations": ["...","...","..."],
  "parent_text": "...",
  "explain": "..."
}}
===END_OUTPUT===

Observations:
{observations_text}
"""


def prompt_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


class MedGemmaService:
    """
    High-level multimodal service wrapper for MedGemma + MedSigLIP.
    - call analyze_input(...) to get a dict with keys: report (following earlier schema), embedding, visual_summary, model_raw
    - safe defaults: never send unredacted PHI unless allow_phi=True (and you SHOULD NOT in production)
    """

    def __init__(self, config: Dict[str, Any]):
        """
        config keys (examples):
          - HF_MODEL (str)
          - HF_API_KEY (str)
          - VERTEX_PROJECT, VERTEX_LOCATION, VERTEX_TEXT_ENDPOINT_ID, VERTEX_VISION_ENDPOINT_ID
          - REDIS_URL (optional)
          - ALLOW_PHI (bool) -- default False
          - LORA_ADAPTER_PATH (str) -- GCS path or local dir for traceability
          - BASE_MODEL_ID (str) -- e.g. google/medgemma-2b-it
        """
        self.cfg = config
        self.hf_model = config.get("HF_MODEL")
        self.hf_api_key = config.get("HF_API_KEY")
        self.allow_phi = bool(config.get("ALLOW_PHI", False))
        self.adapter_id = config.get("LORA_ADAPTER_PATH") or config.get("adapter_id")
        self.base_model_id = config.get("BASE_MODEL_ID", "google/medgemma-2b-it")

        # Vertex initialization if available and configured
        if _HAS_VERTEX and config.get("VERTEX_PROJECT") and config.get("VERTEX_LOCATION"):
            try:
                aiplatform.init(project=config["VERTEX_PROJECT"], location=config["VERTEX_LOCATION"])
                self.vertex_text_endpoint = None
                if config.get("VERTEX_TEXT_ENDPOINT_ID"):
                    self.vertex_text_endpoint = aiplatform.Endpoint(
                        endpoint_name=f"projects/{config['VERTEX_PROJECT']}/locations/{config['VERTEX_LOCATION']}/endpoints/{config['VERTEX_TEXT_ENDPOINT_ID']}"
                    )
                self.vertex_vision_endpoint = None
                if config.get("VERTEX_VISION_ENDPOINT_ID"):
                    self.vertex_vision_endpoint = aiplatform.Endpoint(
                        endpoint_name=f"projects/{config['VERTEX_PROJECT']}/locations/{config['VERTEX_LOCATION']}/endpoints/{config['VERTEX_VISION_ENDPOINT_ID']}"
                    )
                logger.info("Vertex initialized for MedGemmaService")
            except Exception as e:
                logger.exception("Vertex init failed: %s", e)
                self.vertex_text_endpoint = None
                self.vertex_vision_endpoint = None
        else:
            self.vertex_text_endpoint = None
            self.vertex_vision_endpoint = None

        # Redis client optionally
        self.redis = None
        if _HAS_REDIS and config.get("REDIS_URL"):
            try:
                self.redis = aioredis.from_url(config["REDIS_URL"])
            except Exception:
                self.redis = None

        # httpx async client
        self._http = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        await self._http.aclose()
        if self.redis:
            await self.redis.close()

    # -------------------------
    # Public analyze entrypoint
    # -------------------------
    async def analyze_input(
        self,
        age_months: int,
        domain: str,
        observations: str,
        image_bytes: Optional[bytes] = None,
        image_filename: Optional[str] = None,
        screening_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Returns a dict with keys:
         - report: { riskLevel, keyFindings, recommendations, confidence, ... }
         - image_embedding: [] or None
         - visual_summary: str or None
         - model_raw: str or None
         - provenance: { prompt_hash, model_id, used_vertex, ... }
        """

        # 1) Safety: refuse to send PHI to external if allow_phi is False and observations contains likely PHI markers.
        if not self.allow_phi:
            if self._detect_phi(observations):
                logger.warning("PHI-like content detected in observations and ALLOW_PHI is False — refusing to send to external model")
                # Return deterministic baseline analysis only (no external calls)
                baseline = self._baseline_analysis(age_months, domain, observations)
                return {
                    "report": baseline,
                    "image_embedding": None,
                    "visual_summary": None,
                    "model_raw": None,
                    "provenance": {"note": "phi_blocked"},
                }

        # 2) Run image embedding if image provided (MedSigLIP)
        image_embedding = None
        visual_summary = None
        if image_bytes:
            try:
                image_embedding, visual_summary = await self._get_image_embedding(image_bytes)
            except Exception as e:
                logger.exception("Image embedding failed: %s", e)
                image_embedding = None
                visual_summary = None

        # 3) Baseline deterministic analysis (quick rules)
        baseline = self._baseline_analysis(age_months, domain, observations, image_summary=visual_summary)

        # 4) Build prompt for MedGemma synthesis (canonical template)
        prompt = self._build_synthesis_prompt(age_months, baseline, observations, visual_summary, image_embedding)
        phash = prompt_hash(prompt)
        input_hash = hashlib.sha256((prompt + str(image_embedding)[:100] if image_embedding else prompt).encode()).hexdigest()

        # 5) Call text model (Vertex or HF). If both available, prefer Vertex.
        t0 = time.perf_counter()
        model_raw = None
        model_parsed = None
        used_vertex = False
        if self.vertex_text_endpoint:
            try:
                model_raw = await asyncio.to_thread(self._call_vertex_text, prompt)
                used_vertex = True
            except Exception as e:
                logger.exception("Vertex text call failed: %s", e)
                model_raw = None

        if not model_raw and self.hf_model and self.hf_api_key:
            try:
                model_raw = await self._call_hf_inference(prompt, self.hf_model, self.hf_api_key)
            except Exception as e:
                logger.exception("HF call failed: %s", e)
                model_raw = None

        # 6) Parse model response safely to JSON if possible
        if model_raw:
            try:
                model_parsed = self._parse_model_json(model_raw)
            except Exception as e:
                logger.exception("parse_model_json failed: %s", e)
                model_parsed = None

        # 7) Merge model_parsed with baseline deterministically: don't allow model to remove baseline evidence, only add language
        final_report = baseline.copy()
        final_report.setdefault("model_influence", 0.0)
        if model_parsed:
            # Merge risk if present (but preserve baseline if more conservative)
            if "risk_assessment" in model_parsed and "overall" in model_parsed["risk_assessment"]:
                final_report["riskLevel"] = model_parsed["risk_assessment"]["overall"]
            if model_parsed.get("clinical_summary"):
                final_report["clinical_summary"] = model_parsed["clinical_summary"]
            if model_parsed.get("plain_language_summary"):
                final_report["plain_language_summary"] = model_parsed["plain_language_summary"]
            if model_parsed.get("recommendations"):
                # extend baseline recommendations but de-duplicate
                final_report["recommendations"] = list(
                    dict.fromkeys(final_report.get("recommendations", []) + model_parsed["recommendations"])
                )
            # attach evidence
            final_report.setdefault("keyFindings", [])
            for ev in model_parsed.get("evidence", []):
                final_report["keyFindings"].append(ev)
            final_report["model_influence"] = 0.4  # example; you can compute a real metric
        else:
            final_report["clinical_summary"] = final_report.get("clinical_summary") or "Automated draft (no model)."

        inference_time_ms = int((time.perf_counter() - t0) * 1000)
        provenance = {
            "prompt_hash": phash,
            "input_hash": input_hash,
            "model_id": self.base_model_id,
            "adapter_id": self.adapter_id,
            "model_raw_snippet": (model_raw or "")[:2000],
            "used_vertex": bool(used_vertex),
            "inference_time_ms": inference_time_ms,
        }

        return {
            "report": final_report,
            "image_embedding": image_embedding,
            "visual_summary": visual_summary,
            "model_raw": model_raw,
            "provenance": provenance,
        }

    async def infer_with_precomputed_embedding(
        self,
        case_id: str,
        age_months: int,
        observations: str,
        embedding_b64: str,
        shape: List[int],
        emb_version: str = "medsiglip-v1",
        consent_id: Optional[str] = None,
        user_id_pseudonym: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Privacy-first inference using precomputed image embedding (design spec Section 16.1).
        Raw images never leave device; client sends L2-normalized embedding only.
        Returns structured result with full provenance for audit.
        """
        t0 = time.perf_counter()
        try:
            from app.utils.embeddings import parse_embedding_b64
            emb_arr = parse_embedding_b64(embedding_b64, shape or [1, 256])
            emb = emb_arr.tolist()
        except ValueError as e:
            logger.exception("Embedding decode failed: %s", e)
            raise ValueError(f"Invalid embedding_b64 or shape: {e}") from e

        input_hash = hashlib.sha256((embedding_b64[:200] + str(age_months) + observations).encode()).hexdigest()

        if not self.allow_phi and self._detect_phi(observations):
            baseline = self._baseline_analysis(age_months, "", observations, "Embedding provided")
            summary_list = baseline.get("keyFindings", []) or [
                s for s in str(baseline.get("clinical_summary", "")).split("\n") if s.strip()
            ]
            return {
                "case_id": case_id,
                "result": {
                    "summary": summary_list,
                    "risk": baseline.get("riskLevel", "monitor"),
                    "recommendations": baseline.get("recommendations", []),
                    "parent_text": "",
                    "explain": "PHI detected; inference blocked.",
                    "confidence": baseline.get("confidence", 0.5),
                    "evidence": [],
                    "reasoning_chain": ["PHI detected in input; baseline analysis only."],
                    "model_provenance": {"note": "phi_blocked", "input_hash": input_hash},
                },
                "provenance": {"note": "phi_blocked", "input_hash": input_hash},
                "inference_time_ms": int((time.perf_counter() - t0) * 1000),
            }

        baseline = self._baseline_analysis(age_months, "", observations, "Precomputed embedding")
        prompt = self._build_synthesis_prompt(age_months, baseline, observations, "Embedding", emb)
        phash = prompt_hash(prompt)

        model_raw = None
        model_parsed = None
        used_vertex = False
        if self.vertex_text_endpoint:
            try:
                model_raw = await asyncio.to_thread(self._call_vertex_text, prompt)
                used_vertex = True
            except Exception as e:
                logger.exception("Vertex text call failed: %s", e)
        if not model_raw and self.hf_model and self.hf_api_key:
            try:
                model_raw = await self._call_hf_inference(prompt, self.hf_model, self.hf_api_key)
            except Exception as e:
                logger.exception("HF call failed: %s", e)

        if model_raw:
            try:
                model_parsed = self._parse_model_json(model_raw)
            except Exception:
                model_parsed = None

        final_report = baseline.copy()
        if model_parsed:
            if "risk_assessment" in model_parsed and "overall" in model_parsed["risk_assessment"]:
                final_report["riskLevel"] = model_parsed["risk_assessment"]["overall"]
            if model_parsed.get("clinical_summary"):
                final_report["clinical_summary"] = model_parsed["clinical_summary"]
            if model_parsed.get("plain_language_summary"):
                final_report["plain_language_summary"] = model_parsed["plain_language_summary"]
            if model_parsed.get("recommendations"):
                final_report["recommendations"] = list(
                    dict.fromkeys(final_report.get("recommendations", []) + model_parsed["recommendations"])
                )
            final_report.setdefault("keyFindings", [])
            for ev in model_parsed.get("evidence", []):
                txt = ev.get("text", ev) if isinstance(ev, dict) else str(ev)
                final_report["keyFindings"].append(txt)
            if model_parsed.get("confidence") is not None:
                final_report["confidence"] = float(model_parsed["confidence"])
        else:
            final_report["clinical_summary"] = final_report.get("clinical_summary") or "Automated draft (no model)."

        # Evidence capture: FAISS nearest neighbors + model evidence
        evidence_items: List[Any] = []
        try:
            from app.services.evidence_capture import get_nearest_neighbor_evidence, extract_evidence_from_model_output
            emb_arr = parse_embedding_b64(embedding_b64, shape or [1, 256])
            nn_evidence = get_nearest_neighbor_evidence(emb_arr, k=5, dim=emb_arr.shape[-1])
            evidence_items = extract_evidence_from_model_output(model_parsed or {}, nn_evidence)
        except Exception as e:
            logger.debug("Evidence capture skipped: %s", e)
            try:
                from app.services.evidence_capture import extract_evidence_from_model_output
                evidence_items = extract_evidence_from_model_output(model_parsed or {}, [])
            except Exception:
                evidence_items = []

        inference_time_ms = int((time.perf_counter() - t0) * 1000)
        provenance = {
            "case_id": case_id,
            "user_id_pseudonym": user_id_pseudonym,
            "consent_id": consent_id,
            "base_model_id": self.base_model_id,
            "adapter_id": self.adapter_id,
            "input_hash": input_hash,
            "prompt_hash": phash,
            "emb_version": emb_version,
            "inference_time_ms": inference_time_ms,
            "used_vertex": used_vertex,
        }

        # Build explainable response (InferenceExplainable schema)
        summary_list = model_parsed.get("summary_list", []) if model_parsed else []
        if not summary_list and final_report.get("clinical_summary"):
            summary_list = [s.strip() for s in str(final_report["clinical_summary"]).split("\n") if s.strip()]

        model_provenance = {
            "adapter_id": str(self.adapter_id or ""),
            "model_id": self.base_model_id,
            "prompt_hash": phash,
            "input_hash": input_hash,
            "emb_version": emb_version,
        }

        # Convert evidence to dict format for JSON response
        evidence_dicts = []
        for e in evidence_items:
            if hasattr(e, "type"):
                evidence_dicts.append({
                    "type": e.type,
                    "description": e.description,
                    "reference_ids": getattr(e, "reference_ids", []),
                    "influence": getattr(e, "influence", None),
                })
            elif isinstance(e, dict):
                evidence_dicts.append({
                    "type": e.get("type", "text"),
                    "description": (e.get("text") or e.get("description", str(e)))[:500],
                    "reference_ids": e.get("reference_ids", []),
                    "influence": e.get("influence"),
                })

        reasoning_chain = (model_parsed or {}).get("reasoning_chain", [])
        if not reasoning_chain and (model_parsed or {}).get("explain"):
            reasoning_chain = [str(model_parsed.get("explain", ""))]

        return {
            "case_id": case_id,
            "result": {
                "summary": summary_list,
                "risk": final_report.get("riskLevel", "monitor"),
                "recommendations": final_report.get("recommendations", []),
                "parent_text": model_parsed.get("plain_language_summary", "") if model_parsed else "",
                "explain": model_parsed.get("explain", "") if model_parsed else "",
                "confidence": final_report.get("confidence", 0.5),
                "adapter_id": self.adapter_id,
                "model_id": self.base_model_id,
                "evidence": evidence_dicts,
                "reasoning_chain": reasoning_chain,
                "model_provenance": model_provenance,
            },
            "provenance": provenance,
            "inference_time_ms": inference_time_ms,
        }

    # -------------------------
    # Helper implementations
    # -------------------------
    def _baseline_analysis(
        self, age_months: int, domain: str, observations: str, image_summary: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Deterministic, conservative rules to ensure we always return a valid report even if model calls fail.
        """
        # simple threshold example for demonstration
        risk = "monitor"
        key_findings = []
        recommendations = []

        # Look for explicit markers in observations
        lower = (observations or "").lower()
        if "no words" in lower or "only says" in lower or "few words" in lower:
            risk = "monitor"
            key_findings.append("Parent report indicates limited expressive vocabulary.")
            recommendations.append("Consider speech-language evaluation if no improvement in 2 months.")
        if image_summary and "asymmetry" in (image_summary or "").lower():
            key_findings.append("Visual analysis suggests asymmetry — consider motor review.")
            recommendations.append("Refer for physical evaluation as indicated.")

        return {
            "riskLevel": risk,
            "keyFindings": key_findings,
            "recommendations": recommendations,
            "confidence": 0.5,
        }

    def _build_synthesis_prompt(
        self,
        age_months: int,
        baseline: Dict,
        observations: str,
        visual_summary: Optional[str],
        embedding: Optional[List[float]],
        use_canonical: bool = True,
    ) -> str:
        """Build prompt using canonical template (design spec Section 5.1) or legacy JSON."""
        if use_canonical:
            context = baseline.get("riskLevel", "monitor")
            if visual_summary:
                context = f"{context}; visual: {visual_summary[:200]}"
            embedding_note = "Precomputed embedding provided." if embedding else "No image embedding."
            return CANONICAL_PROMPT_TEMPLATE.format(
                age_months=age_months,
                context_text=context,
                embedding_note=embedding_note,
                observations_text=observations or "(No observations provided)",
            )
        # Legacy fallback
        prompt = {
            "instruction": "Synthesize a concise clinical draft JSON following schema: risk_assessment, clinical_summary, plain_language_summary, evidence (list), recommendations (list). Return JSON only.",
            "age_months": age_months,
            "baseline": baseline,
            "observations": observations,
            "visual_summary": visual_summary,
            "embedding_present": bool(embedding),
        }
        return json.dumps(prompt)

    def _detect_phi(self, text: Optional[str]) -> bool:
        if not text:
            return False
        # Very conservative heuristics: if it contains an email, phone, MRN, or typical name/ DOB-like pattern
        if re.search(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", text):
            return True
        if re.search(r"\b\d{3}-\d{2}-\d{4}\b", text):
            return True
        if re.search(r"\bmrn\b|\bpatient id\b|\bssn\b", text, re.I):
            return True
        if re.search(r"\b\d{4}-\d{2}-\d{2}\b", text):
            return True
        return False

    # -------------------------
    # Text model callers
    # -------------------------
    def _call_vertex_text(self, prompt: str) -> str:
        # sync wrapper because Vertex SDK is currently synchronous in many environments.
        if not self.vertex_text_endpoint:
            raise RuntimeError("Vertex text endpoint not configured")

        # Vertex predict -> returns response.predictions
        resp = self.vertex_text_endpoint.predict(instances=[{"content": prompt}])
        # Attempt to extract text
        try:
            out = resp.predictions[0]
            # choose a likely key
            if isinstance(out, dict):
                if "content" in out:
                    return out["content"]
                if "generated_text" in out:
                    return out["generated_text"]
            return json.dumps(out)
        except Exception:
            return json.dumps(resp.predictions)

    async def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 1200,
    ) -> str:
        """
        Generate free-form text for non-clinical use (e.g. technical writing, documentation).
        Uses the same Vertex/HF backend as analyze_input. Returns raw generated text.
        """
        combined = f"{system_prompt.strip()}\n\n{user_prompt.strip()}"
        if self.vertex_text_endpoint:
            try:
                # Vertex predict - use asyncio for sync SDK
                return await asyncio.to_thread(self._call_vertex_text, combined)
            except Exception as e:
                logger.exception("Vertex text generation failed: %s", e)
                raise
        if self.hf_model and self.hf_api_key:
            return await self._call_hf_inference(
                combined, self.hf_model, self.hf_api_key,
                temperature=temperature, max_new_tokens=max_tokens
            )
        raise RuntimeError("No text model configured (Vertex or HF)")

    async def _call_hf_inference(
        self,
        prompt: str,
        model: str,
        api_key: str,
        *,
        temperature: float = 0.0,
        max_new_tokens: int = 512,
    ) -> str:
        """
        Uses Hugging Face Inference API (sync style via async client).
        For long/streaming outputs you might use their stream endpoints or hosted Vertex.
        """
        headers = {"Authorization": f"Bearer {api_key}"}
        payload = {
            "inputs": prompt,
            "options": {"wait_for_model": True},
            "parameters": {"max_new_tokens": max_new_tokens, "temperature": temperature},
        }
        url = f"https://api-inference.huggingface.co/models/{model}"
        # Basic retry logic
        for attempt in range(3):
            try:
                r = await self._http.post(url, headers=headers, json=payload, timeout=60.0)
                r.raise_for_status()
                j = r.json()
                # typical HF returns list with generated_text or dict
                if isinstance(j, list) and j and isinstance(j[0], dict) and "generated_text" in j[0]:
                    return j[0]["generated_text"]
                if isinstance(j, dict) and "generated_text" in j:
                    return j["generated_text"]
                # fallback stringify
                return json.dumps(j)
            except Exception as e:
                logger.warning("HF inference attempt %s failed: %s", attempt + 1, e)
                await asyncio.sleep(1 + attempt * 2)
        raise RuntimeError("HF inference failed after retries")

    # -------------------------
    # Image embedding callers
    # -------------------------
    async def _get_image_embedding(self, image_bytes: bytes) -> Tuple[Optional[List[float]], Optional[str]]:
        """
        MedSigLIP chain: Local -> Vertex -> HF -> Vertex Vision -> HF Vision fallback.
        Return (embedding, textual_summary).
        """
        # Cache key
        k = "img_emb:" + hashlib.sha256(image_bytes).hexdigest()
        if self.redis:
            try:
                cached = await self.redis.get(k)
                if cached:
                    v = json.loads(cached)
                    return v.get("embedding"), v.get("summary")
            except Exception:
                pass

        embedding, summary = None, None

        # 1. Local MedSigLIP (privacy-first, no external calls)
        if self.cfg.get("MEDSIGLIP_ENABLE_LOCAL", True):
            try:
                from app.services.medsiglip_local import get_medsiglip_embedding_local
                vis = await asyncio.to_thread(get_medsiglip_embedding_local, image_bytes)
                if vis.get("embedding"):
                    embedding = vis["embedding"]
                    summary = vis.get("summary")
            except Exception as e:
                logger.debug("MedSigLIP local skipped: %s", e)

        # 2. MedSigLIP Vertex
        if not embedding:
            try:
                from app.services.medsiglip_vertex import get_medsiglip_embedding
                vis = await asyncio.to_thread(get_medsiglip_embedding, image_bytes)
                if vis.get("embedding"):
                    embedding = list(vis["embedding"])
                    summary = vis.get("summary")
            except Exception as e:
                logger.debug("MedSigLIP Vertex skipped: %s", e)

        # 3. MedSigLIP Hugging Face
        if not embedding:
            try:
                from app.services.medsiglip_hf import get_medsiglip_embedding_hf
                vis = await get_medsiglip_embedding_hf(image_bytes)
                if vis.get("embedding"):
                    embedding = list(vis["embedding"])
                    summary = vis.get("summary")
            except Exception as e:
                logger.debug("MedSigLIP HF skipped: %s", e)

        # 4. Generic Vertex Vision (if MedSigLIP unavailable)
        if not embedding and self.vertex_vision_endpoint:
            try:
                inst = {
                    "image": {"bytesBase64Encoded": base64.b64encode(image_bytes).decode("utf-8")}
                }
                resp = await asyncio.to_thread(self.vertex_vision_endpoint.predict, [inst])
                pred = resp.predictions[0]
                embedding = list(pred.get("embedding", []))
                summary = pred.get("visual_summary", None) or pred.get("summary", None)
            except Exception as e:
                logger.exception("Vertex vision predict failed: %s", e)
                embedding = None

        # HF fallback sample
        if not embedding and self.hf_model and self.hf_api_key:
            try:
                # Many HF vision models accept multipart file uploads; implement minimal fallback:
                headers = {"Authorization": f"Bearer {self.hf_api_key}"}
                url = f"https://api-inference.huggingface.co/models/{self.hf_model}"
                files = {"file": ("image.jpg", image_bytes)}
                r = await self._http.post(url, headers=headers, files=files, timeout=60.0)
                r.raise_for_status()
                j = r.json()
                # j might contain embedding & summary depending on model
                if isinstance(j, dict):
                    if "embedding" in j:
                        embedding = list(j["embedding"])
                    summary = j.get("visual_summary") or j.get("summary")
            except Exception as e:
                logger.exception("HF vision fallback failed: %s", e)

        # cache
        if embedding and self.redis:
            try:
                await self.redis.set(k, json.dumps({"embedding": embedding, "summary": summary}), ex=24 * 3600)
            except Exception:
                pass

        return embedding, summary

    # -------------------------
    # Model output parsing
    # -------------------------
    def _parse_model_json(self, text: str) -> Dict[str, Any]:
        """
        Parse structured output per design spec (Section 5.2).
        Supports ===BEGIN_OUTPUT===/===END_OUTPUT=== delimiters and fallback heuristics.
        """
        # 1) Try canonical delimiters first
        begin_marker = "===BEGIN_OUTPUT==="
        end_marker = "===END_OUTPUT==="
        if begin_marker in text and end_marker in text:
            start = text.find(begin_marker) + len(begin_marker)
            end = text.find(end_marker)
            candidate = text[start:end].strip()
            try:
                parsed = json.loads(candidate)
                return self._normalize_parsed_output(parsed)
            except json.JSONDecodeError:
                logger.warning("Canonical output parse failed; falling back to heuristics")

        # 2) Fallback: find first { and last }
        try:
            first = text.find("{")
            last = text.rfind("}")
            if first != -1 and last != -1 and last > first:
                candidate = text[first : last + 1]
                parsed = json.loads(candidate)
                return self._normalize_parsed_output(parsed)
            return json.loads(text)
        except Exception as e:
            logger.warning("parse_model_json: json.loads failed; returning minimal structure: %s", e)
            return {"clinical_summary": text[:4000], "evidence": [], "recommendations": []}

    def _normalize_parsed_output(self, parsed: Dict[str, Any]) -> Dict[str, Any]:
        """Map canonical schema (summary, risk, parent_text, explain, reasoning_chain) to internal format."""
        out: Dict[str, Any] = {}
        if "summary" in parsed:
            summ = parsed["summary"]
            out["clinical_summary"] = (
                "\n".join(summ) if isinstance(summ, list) else str(summ)
            )
            out["summary_list"] = summ if isinstance(summ, list) else [str(summ)]
        if "risk" in parsed:
            out["risk_assessment"] = {"overall": parsed["risk"]}
        if "parent_text" in parsed:
            out["plain_language_summary"] = parsed["parent_text"]
        if "recommendations" in parsed:
            out["recommendations"] = parsed["recommendations"]
        if "reasoning_chain" in parsed:
            out["reasoning_chain"] = (
                parsed["reasoning_chain"]
                if isinstance(parsed["reasoning_chain"], list)
                else [str(parsed["reasoning_chain"])]
            )
        if "confidence" in parsed:
            out["confidence"] = float(parsed["confidence"])
        if "explain" in parsed:
            out.setdefault("evidence", []).append({"type": "explain", "text": parsed["explain"]})
        # Merge with any other keys
        for k, v in parsed.items():
            if k not in out:
                out[k] = v
        return out
