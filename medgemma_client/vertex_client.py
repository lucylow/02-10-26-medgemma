"""Vertex AI MedGemma endpoint wrapper. Follows Get started with MedGemma (Vertex)."""
import os
import time
from typing import Optional

from .schemas import ScreeningRequest, ScreeningResponse


class VertexMedGemmaClient:
    def __init__(
        self,
        project: Optional[str] = None,
        location: Optional[str] = None,
        endpoint_id: Optional[str] = None,
    ):
        self.project = project or os.environ.get("VERTEX_PROJECT")
        self.location = location or os.environ.get("VERTEX_LOCATION", "us-central1")
        self.endpoint_id = endpoint_id or os.environ.get("VERTEX_TEXT_ENDPOINT_ID")
        self._client = None

    def _get_client(self):
        if self._client is not None:
            return self._client
        try:
            from google.cloud import aiplatform
            aiplatform.init(project=self.project, location=self.location)
            self._client = aiplatform.Endpoint(self.endpoint_id)
            return self._client
        except Exception as e:
            raise RuntimeError(f"Vertex client init failed: {e}") from e

    def screen(self, req: ScreeningRequest) -> ScreeningResponse:
        if not self.endpoint_id or not self.project:
            raise RuntimeError("VERTEX_PROJECT and VERTEX_TEXT_ENDPOINT_ID must be set")
        prompt = self._build_prompt(req)
        start = time.perf_counter()
        try:
            response = self._get_client().predict(instances=[{"prompt": prompt}])
            predictions = response.predictions if hasattr(response, "predictions") else []
            text = predictions[0] if predictions else ""
        except Exception as e:
            return ScreeningResponse(
                risk="moderate",
                recommendations=[],
                confidence=0.0,
                model_id="vertex/medgemma",
                inference_time_s=time.perf_counter() - start,
                fallback_used=True,
            )
        elapsed = time.perf_counter() - start
        import json, re
        parsed = None
        m = re.search(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", str(text), re.DOTALL)
        if m:
            try:
                parsed = json.loads(m.group(0))
            except Exception:
                pass
        risk = "moderate"
        recs = []
        conf = 0.5
        if parsed:
            rs = parsed.get("risk_stratification") or {}
            risk = (rs.get("level") or risk).lower()
            recs = parsed.get("recommendations") or []
            if isinstance(recs, dict):
                recs = recs.get("immediate", []) + recs.get("short_term", [])
            conf = float(rs.get("confidence", conf))
        return ScreeningResponse(
            risk=risk,
            recommendations=recs,
            confidence=conf,
            model_id="vertex/medgemma",
            raw_json=parsed,
            inference_time_s=elapsed,
            fallback_used=False,
        )

    def _build_prompt(self, req: ScreeningRequest) -> str:
        return f"""Pediatric screening support. Age (months): {req.age_months}. Observations: {req.observations or "None."}
Respond with JSON: risk_stratification (level, confidence), clinical_summary, recommendations."""
