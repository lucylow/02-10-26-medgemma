"""
Page 3: Ingestion Validation & Preprocessing Pipeline.
Central validation and transformation for health data submissions.
"""
import unicodedata
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple


@dataclass
class DataQualityReport:
    """Health data quality report for each submission."""
    completeness_score: float = 0.0
    missing_fields: List[str] = field(default_factory=list)
    probability_of_noise: float = 0.0
    consent_present: bool = False
    consent_id: Optional[str] = None
    validation_errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


class HealthDataPreprocessor:
    """
    Central preprocessor for health data:
    - Normalize text (trim, unicode normalization)
    - Validate numeric ranges
    - Enforce required fields
    - Handle consent flags explicitly
    - Produce data quality report
    """

    REQUIRED_SCREENING_FIELDS = {"child_age_months", "domain", "observations"}
    REQUIRED_IMAGE_METADATA = {"consent_flag"}
    MAX_OBSERVATIONS_LEN = 10000
    VALID_DOMAINS = {
        "communication", "motor", "gross_motor", "fine_motor",
        "social", "cognitive", "problem_solving", "personal_social",
        "language",
    }

    def __init__(self, require_consent_for_images: bool = True):
        self.require_consent_for_images = require_consent_for_images

    def normalize_text(self, text: Optional[str]) -> str:
        """Trim and apply Unicode NFC normalization."""
        if not text:
            return ""
        s = str(text).strip()
        s = unicodedata.normalize("NFC", s)
        return s

    def validate_numeric_range(
        self,
        value: Any,
        field_name: str,
        min_val: float,
        max_val: float,
    ) -> Optional[float]:
        """Validate numeric value is in range. Returns float or None if invalid."""
        try:
            v = float(value)
            if min_val <= v <= max_val:
                return v
            return None
        except (TypeError, ValueError):
            return None

    def validate_required_fields(
        self,
        payload: Dict[str, Any],
        required: Set[str],
    ) -> List[str]:
        """Return list of missing required field names."""
        missing = []
        for f in required:
            val = payload.get(f)
            if val is None or (isinstance(val, str) and not val.strip()):
                missing.append(f)
        return missing

    def process_screening_input(
        self,
        payload: Dict[str, Any],
        has_image: bool = False,
    ) -> Tuple[Dict[str, Any], DataQualityReport]:
        """
        Process screening payload: normalize, validate, produce quality report.
        Returns (processed_payload, quality_report).
        Refuses if consent required for image but not present.
        """
        report = DataQualityReport()
        out = dict(payload)

        # 1) Normalize text fields
        if "observations" in out and out["observations"] is not None:
            out["observations"] = self.normalize_text(out["observations"])
        if "domain" in out and out["domain"] is not None:
            out["domain"] = self.normalize_text(str(out["domain"])).lower() or "communication"

        # 2) Validate required fields
        missing = self.validate_required_fields(out, self.REQUIRED_SCREENING_FIELDS)
        if missing:
            report.missing_fields = missing
            report.validation_errors.extend([f"Missing required field: {f}" for f in missing])

        # 3) Validate age
        age = out.get("child_age_months") or out.get("childAge")
        if age is not None:
            age_val = self.validate_numeric_range(age, "child_age_months", 0, 240)
            if age_val is None:
                report.validation_errors.append("child_age_months must be 0–240")
            else:
                out["child_age_months"] = int(age_val)
                if "childAge" not in out:
                    out["childAge"] = int(age_val)

        # 4) Validate domain
        domain = out.get("domain", "")
        if domain and domain not in self.VALID_DOMAINS:
            report.warnings.append(f"Domain '{domain}' not in standard set; accepted but non-standard")

        # 5) Consent for images
        consent_flag = out.get("consent_flag") or payload.get("consent_flag")
        consent_id = out.get("consent_id") or payload.get("consent_id")
        report.consent_present = bool(consent_flag or consent_id)
        report.consent_id = consent_id

        if has_image and self.require_consent_for_images and not report.consent_present:
            report.validation_errors.append("Image provided but consent_flag/consent_id not present")
            report.consent_present = False

        # 6) Observations length
        obs = out.get("observations", "")
        if len(obs) > self.MAX_OBSERVATIONS_LEN:
            report.validation_errors.append(
                f"observations exceeds max length ({self.MAX_OBSERVATIONS_LEN})"
            )
            out["observations"] = obs[:self.MAX_OBSERVATIONS_LEN]
            report.warnings.append("observations truncated")

        # 7) Heuristic probability of noise (e.g. gibberish, placeholder text)
        report.probability_of_noise = self._noise_heuristic(obs)

        # 8) Completeness score (0–1)
        total_checks = 5
        passed = 0
        if not report.missing_fields:
            passed += 1
        if age is not None and "child_age_months must be" not in " ".join(report.validation_errors):
            passed += 1
        if report.consent_present or not has_image:
            passed += 1
        if len(obs) > 10:
            passed += 1
        if report.probability_of_noise < 0.5:
            passed += 1
        report.completeness_score = passed / total_checks

        return out, report

    def _noise_heuristic(self, text: str) -> float:
        """
        Heuristic probability that text is noise (placeholder, gibberish).
        Returns 0–1. Higher = more likely noise.
        """
        if not text or len(text) < 5:
            return 0.3
        text_lower = text.lower()
        # Placeholder patterns
        if re.search(r"^(test|asdf|xxx|aaa|sample|placeholder|lorem)\b", text_lower):
            return 0.9
        if re.search(r"^[a-z]\s+[a-z]\s+[a-z]", text_lower) and len(text) < 20:
            return 0.6
        # Very short with no real words
        words = text.split()
        if len(words) < 3 and len(text) < 15:
            return 0.5
        return 0.1

    def process_image_metadata(
        self,
        metadata: Dict[str, Any],
    ) -> Tuple[Dict[str, Any], DataQualityReport]:
        """
        Process image metadata: size, age, device, consent.
        Returns (processed_metadata, quality_report).
        """
        report = DataQualityReport()
        out = dict(metadata)

        consent_flag = out.get("consent_flag", False)
        consent_id = out.get("consent_id")
        report.consent_present = bool(consent_flag or consent_id)
        report.consent_id = consent_id

        if self.require_consent_for_images and not report.consent_present:
            report.validation_errors.append("consent_flag required for image metadata")
            report.completeness_score = 0.0
        else:
            report.completeness_score = 0.9

        return out, report
