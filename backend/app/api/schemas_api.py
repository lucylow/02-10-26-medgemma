"""
API for JSON Schema export — enables frontend auto-generation of forms.
Page 2: Data Model & Schema Refinement.
"""
from fastapi import APIRouter, Depends

from app.core.security import get_api_key
from app.schemas.health_data import (
    get_screening_input_json_schema,
    get_questionnaire_scores_json_schema,
    get_asq_domain_scores_json_schema,
)

router = APIRouter(prefix="/api/schemas", tags=["Schemas"])


@router.get("/screening-input", dependencies=[Depends(get_api_key)])
async def screening_input_schema():
    """Return JSON Schema for ScreeningInput. Frontend can use this to auto-generate forms."""
    return get_screening_input_json_schema()


@router.get("/questionnaire-scores", dependencies=[Depends(get_api_key)])
async def questionnaire_scores_schema():
    """Return JSON Schema for QuestionnaireScores."""
    return get_questionnaire_scores_json_schema()


@router.get("/asq-domain-scores", dependencies=[Depends(get_api_key)])
async def asq_domain_scores_schema():
    """Return JSON Schema for ASQDomainScores."""
    return get_asq_domain_scores_json_schema()
