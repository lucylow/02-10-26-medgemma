# agents/safety_advanced.py
import re, json
from typing import Dict, List
from loguru import logger
from jsonschema import validate, ValidationError
from transformers import pipeline

# Small NLI model for entailment checks (distilbart-mnli is smallish)
NLI_MODEL = "valhalla/distilbart-mnli-12-1"  # reasonably small
logger.info("Loading NLI model for safety entailment...")
# Initialize pipeline lazily or at module level
try:
    nli = pipeline("text-classification", model=NLI_MODEL, device=-1, return_all_scores=True)
except Exception as e:
    logger.warning("Could not load NLI model: {}", e)
    nli = None

# JSON schema for MedGemma output (strict)
MEDGEMMA_SCHEMA = {
  "type": "object",
  "properties": {
    "summary": {"type": "array", "items": {"type": "string"}},
    "risk": {"type": "string", "enum": ["low","monitor","elevated"]},
    "rationale": {"type": "string"},
    "next_steps": {"type": "array", "items": {"type": "string"}},
    "confidence": {"type": "number", "minimum": 0.0, "maximum": 1.0}
  },
  "required": ["summary","risk","rationale","next_steps","confidence"]
}

# token-level banned words (regex)
BANNED_PATTERNS = [
  r"\bdiagnos(e|is|ed)\b",
  r"\bwill\b",
  r"\bdefinitely\b",
  r"\bguarantee\b",
  r"\b100%\b"
]

def check_schema(obj: Dict) -> List[str]:
    errs = []
    try:
        validate(instance=obj, schema=MEDGEMMA_SCHEMA)
    except ValidationError as e:
        errs.append(f"schema_violation:{str(e.message)}")
    return errs

def check_banned_text(obj: Dict) -> List[str]:
    text = " ".join(obj.get("summary",[]) + [obj.get("rationale","")])
    hits = []
    for pat in BANNED_PATTERNS:
        if re.search(pat, text, flags=re.I):
            hits.append(f"banned_phrase:{pat}")
    return hits

def entailment_check(observations: str, medgemma_obj: Dict) -> List[str]:
    """
    Use NLI model to check whether medgemma claims are entailed by inputs.
    We'll check each summary sentence: does observations entail the summary sentence?
    If model predicts contradiction or neutral strongly, we flag.
    """
    if nli is None:
        return ["nli_unavailable"]
        
    flags = []
    summary_items = medgemma_obj.get("summary", [])
    for s in summary_items:
        premise = observations
        hypothesis = s
        try:
            # scores structure varies; we look for label with highest probability
            # For distilbart-mnli: labels are ['CONTRADICTION','NEUTRAL','ENTAILMENT']
            res = nli(f"{premise} </s> {hypothesis}")  # returns list of labels with scores
            best = max(res[0], key=lambda x: x['score'])
            label = best['label'].lower()
            if label != "entailment":
                flags.append(f"nli_not_entail:{label}:{hypothesis[:60]}")
        except Exception as e:
            logger.exception("NLI call failed: {}", e)
            flags.append("nli_error")
    return flags

def advanced_safety(medgemma_obj: Dict, observations: str) -> Dict:
    reasons = []
    ok = True
    reasons += check_schema(medgemma_obj)
    reasons += check_banned_text(medgemma_obj)
    reasons += entailment_check(observations, medgemma_obj)
    if reasons:
        ok = False
    return {"ok": ok, "reasons": reasons}
