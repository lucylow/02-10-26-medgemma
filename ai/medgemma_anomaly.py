"""
PediScreen IoT — MedGemma Edge Anomaly Detection for pediatric vital signs.
Analyzes batches of wearable readings (HR, SpO2, temp, activity) for early diagnosis.
Designed for edge deployment (e.g. IoT Gateway); can call MedGemma-2B-edge when available.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import List, Optional

# Optional: medgemma edge model (stub if not installed)
try:
    import medgemma  # type: ignore
except ImportError:
    medgemma = None


@dataclass
class WearableReading:
    device_id: str
    heart_rate: float  # bpm
    spo2: float  # 0-100
    activity_level: float  # steps/hour
    temperature: float  # °C
    timestamp: float  # unix ms or s


@dataclass
class Anomaly:
    device_id: str
    type: str  # BRADYCARDIA, HYPOXIA, FEVER, HYPOTHERMIA, ACTIVITY_OUTLIER
    severity: int  # 1-10


# Pediatric thresholds (0-5yo)
DEFAULT_THRESHOLDS = {
    "bradycardia": 60,  # bpm < 60
    "tachycardia": 180,  # bpm > 180
    "hypoxia": 92,  # SpO2 < 92%
    "fever": 38.5,  # °C > 38.5
    "hypothermia": 36.0,  # °C < 36.0
}


class PediatricAnomalyDetector:
    """
    Edge AI anomaly detection for pediatric RPM.
    Uses rule-based thresholds by default; can use MedGemma-2B-edge for NL analysis when available.
    """

    def __init__(
        self,
        model_name: str = "medgemma-2b-edge",
        thresholds: Optional[dict] = None,
    ):
        self.model_name = model_name
        self.thresholds = thresholds or DEFAULT_THRESHOLDS
        self._model = None
        if medgemma is not None:
            try:
                self._model = medgemma.load(model_name)
            except Exception:
                pass

    def _rule_based_anomalies(self, batch: List[WearableReading]) -> List[Anomaly]:
        anomalies: List[Anomaly] = []
        for r in batch:
            if r.heart_rate < self.thresholds["bradycardia"]:
                anomalies.append(
                    Anomaly(device_id=r.device_id, type="BRADYCARDIA", severity=8)
                )
            if r.heart_rate > self.thresholds["tachycardia"]:
                anomalies.append(
                    Anomaly(device_id=r.device_id, type="TACHYCARDIA", severity=7)
                )
            if r.spo2 < self.thresholds["hypoxia"]:
                anomalies.append(
                    Anomaly(device_id=r.device_id, type="HYPOXIA", severity=9)
                )
            if r.temperature > self.thresholds["fever"]:
                anomalies.append(
                    Anomaly(device_id=r.device_id, type="FEVER", severity=7)
                )
            if r.temperature < self.thresholds["hypothermia"]:
                anomalies.append(
                    Anomaly(device_id=r.device_id, type="HYPOTHERMIA", severity=8)
                )
        return anomalies

    def build_anomaly_prompt(self, batch: List[WearableReading]) -> str:
        return f"""
Pediatric vital signs anomaly detection (0-5yo patients):

Batch contains {len(batch)} readings. Detect:
- Bradycardia: HR < 60 bpm
- Hypoxia: SpO2 < 92%
- Fever: Temp > 38.5°C
- Hypothermia: Temp < 36.0°C
- Activity outliers

Return JSON only: {{"anomalies": [{{"device_id": "...", "type": "...", "severity": 1-10}}]}}

Sample readings (first 5): {json.dumps([{"device_id": r.device_id, "hr": r.heart_rate, "spo2": r.spo2, "temp": r.temperature} for r in batch[:5]])}
"""

    def parse_anomalies(self, response: str) -> List[Anomaly]:
        anomalies: List[Anomaly] = []
        try:
            # Extract JSON block if model wrapped it
            match = re.search(r"\{[\s\S]*\}", response)
            if match:
                data = json.loads(match.group())
                for a in data.get("anomalies", []):
                    anomalies.append(
                        Anomaly(
                            device_id=a.get("device_id", ""),
                            type=a.get("type", "UNKNOWN"),
                            severity=int(a.get("severity", 5)),
                        )
                    )
        except (json.JSONDecodeError, KeyError, TypeError):
            pass
        return anomalies

    async def analyze_batch(self, batch: List[WearableReading]) -> List[Anomaly]:
        """
        Analyze a batch of wearable readings; returns list of anomalies.
        Uses MedGemma edge model when available, else rule-based thresholds.
        """
        if self._model is not None:
            try:
                prompt = self.build_anomaly_prompt(batch)
                response = await self._model.generate(prompt)
                return self.parse_anomalies(response)
            except Exception:
                pass
        return self._rule_based_anomalies(batch)

    def analyze_batch_sync(self, batch: List[WearableReading]) -> List[Anomaly]:
        """Synchronous version (rule-based only)."""
        return self._rule_based_anomalies(batch)
