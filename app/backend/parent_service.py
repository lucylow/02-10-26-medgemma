from typing import Optional, Dict, Any
from .gemma3_service import Gemma3Service
from loguru import logger

# Singleton or factory approach for the service
_gemma3_service: Optional[Gemma3Service] = None

def get_gemma3():
    global _gemma3_service
    if _gemma3_service is None:
        try:
            _gemma3_service = Gemma3Service()
        except Exception as e:
            logger.warning(f"Failed to initialize Gemma3Service, parent delivery will use fallback: {e}")
    return _gemma3_service

def rewrite_for_parent(medgemma_output: Any) -> str:
    """
    Takes MedGemma output (clinician-facing) and rewrites it for a parent using Gemma 3.
    """
    clinical_text = ""
    if isinstance(medgemma_output, dict):
        # Extract findings or summary
        findings = medgemma_output.get("findings", [])
        if not findings:
            findings = medgemma_output.get("summary", [])
        
        rationale = medgemma_output.get("rationale", "")
        clinical_text = f"Findings: {', '.join(findings)}. Rationale: {rationale}"
    else:
        clinical_text = str(medgemma_output)

    g3 = get_gemma3()
    if g3:
        try:
            return g3.rewrite_for_parents(clinical_text)
        except Exception as e:
            logger.error(f"Gemma 3 rewrite failed: {e}")
    
    # Simple fallback if Gemma 3 is unavailable or fails
    return f"Developmental screening update: {clinical_text}. Please discuss these results with your pediatrician."
