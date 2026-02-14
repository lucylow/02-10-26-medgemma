"""
Page 2: Data Model & Schema Refinement — tests for health data schemas.
Validates improper payloads are rejected with clear messages.
"""
import pytest
from pydantic import ValidationError

from app.schemas.health_data import (
    ASQDomainScores,
    ScreeningInput,
    QuestionnaireScores,
    QuestionnaireType,
    ImageReference,
    EmbeddingWithMetadata,
    EmbeddingMetadata,
)


class TestASQDomainScores:
    """ASQ-3 domain scores: each 0–60."""

    def test_valid_scores(self):
        s = ASQDomainScores(
            communication=45,
            gross_motor=50,
            fine_motor=48,
            problem_solving=52,
            personal_social=55,
        )
        assert s.communication == 45
        assert s.personal_social == 55

    def test_invalid_range_high(self):
        with pytest.raises(ValidationError) as exc_info:
            ASQDomainScores(
                communication=61,
                gross_motor=50,
                fine_motor=48,
                problem_solving=52,
                personal_social=55,
            )
        errs = exc_info.value.errors()
        assert any("61" in str(e) or "communication" in str(e).lower() for e in errs)

    def test_invalid_range_negative(self):
        with pytest.raises(ValidationError) as exc_info:
            ASQDomainScores(
                communication=-1,
                gross_motor=50,
                fine_motor=48,
                problem_solving=52,
                personal_social=55,
            )
        assert exc_info.value

    def test_missing_key(self):
        with pytest.raises(ValidationError):
            ASQDomainScores(
                communication=45,
                gross_motor=50,
                fine_motor=48,
                problem_solving=52,
                # missing personal_social
            )


class TestQuestionnaireScores:
    """Questionnaire scores validation."""

    def test_normalized_scores_valid(self):
        q = QuestionnaireScores(
            questionnaire_type=QuestionnaireType.CUSTOM,
            normalized_scores={"communication": 0.3, "motor": 0.85},
        )
        assert q.normalized_scores["communication"] == 0.3

    def test_normalized_scores_invalid_range(self):
        with pytest.raises(ValidationError) as exc_info:
            QuestionnaireScores(
                questionnaire_type=QuestionnaireType.CUSTOM,
                normalized_scores={"communication": 1.5},
            )
        assert "1.5" in str(exc_info.value) or "0" in str(exc_info.value)


class TestScreeningInput:
    """ScreeningInput validation."""

    def test_valid_minimal(self):
        s = ScreeningInput(child_age_months=24, domain="communication", observations="test")
        assert s.child_age_months == 24
        assert s.domain == "communication"

    def test_age_out_of_range(self):
        with pytest.raises(ValidationError):
            ScreeningInput(
                child_age_months=300,
                domain="communication",
                observations="test",
            )

    def test_age_negative(self):
        with pytest.raises(ValidationError):
            ScreeningInput(
                child_age_months=-1,
                domain="communication",
                observations="test",
            )

    def test_domain_normalized_to_lower(self):
        s = ScreeningInput(child_age_months=24, domain="COMMUNICATION", observations="")
        assert s.domain == "communication"

    def test_observations_max_length(self):
        with pytest.raises(ValidationError):
            ScreeningInput(
                child_age_months=24,
                domain="communication",
                observations="x" * 10001,
            )


class TestImageReference:
    """Image reference with consent flag."""

    def test_consent_required(self):
        ref = ImageReference(reference_id="img-001", consent_flag=True, consent_id="c-123")
        assert ref.consent_flag is True
        assert ref.consent_id == "c-123"

    def test_size_bytes_validation(self):
        with pytest.raises(ValidationError):
            ImageReference(
                reference_id="img-001",
                consent_flag=True,
                size_bytes=-1,
            )


class TestEmbeddingMetadata:
    """Embedding metadata for provenance."""

    def test_defaults(self):
        m = EmbeddingMetadata()
        assert m.embedding_version == "medsiglip-v1"
        assert m.consent_flag is False
