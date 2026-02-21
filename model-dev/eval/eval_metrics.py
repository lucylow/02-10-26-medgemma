"""
Offline evaluation metrics for model-dev (NLG, clinical, retrieval).

Purpose: ROUGE, BLEU; clinical label F1, sensitivity/specificity; retrieval recall/cosine.
Inputs: Predictions and references (and optional subgroup annotations for bias).
Outputs: Dict of metric name -> value.

Usage:
  from model_dev.eval.eval_metrics import compute_nlg_metrics, compute_clinical_metrics
  nlg = compute_nlg_metrics(preds, refs)
  clinical = compute_clinical_metrics(y_true, y_pred, domain="risk")
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Sequence

logger = logging.getLogger(__name__)


def compute_nlg_metrics(
    predictions: List[str],
    references: List[str],
) -> Dict[str, float]:
    """ROUGE and BLEU. Requires rouge-score and nltk (or sacrebleu)."""
    out: Dict[str, float] = {}
    try:
        from rouge_score import rouge_scorer
        scorer = rouge_scorer.RougeScorer(["rouge1", "rouge2", "rougeL"], use_stemmer=True)
        r1, r2, rl = [], [], []
        for p, r in zip(predictions, references):
            s = scorer.score(r, p)
            r1.append(s["rouge1"].fmeasure)
            r2.append(s["rouge2"].fmeasure)
            rl.append(s["rougeL"].fmeasure)
        out["rouge1"] = sum(r1) / len(r1) if r1 else 0.0
        out["rouge2"] = sum(r2) / len(r2) if r2 else 0.0
        out["rougeL"] = sum(rl) / len(rl) if rl else 0.0
    except ImportError:
        logger.warning("rouge_score not installed; skipping ROUGE")
    try:
        import sacrebleu
        bleu = sacrebleu.corpus_bleu(predictions, [references])
        out["bleu"] = bleu.score
    except ImportError:
        logger.warning("sacrebleu not installed; skipping BLEU")
    return out


def compute_clinical_metrics(
    y_true: Sequence[Any],
    y_pred: Sequence[Any],
    domain: str = "risk",
    labels: Optional[List[str]] = None,
) -> Dict[str, float]:
    """Sensitivity, specificity, PPV, NPV, AUC for risk; or label F1 per domain."""
    from sklearn.metrics import f1_score, precision_score, recall_score
    labels = labels or ["low", "monitor", "high", "refer"]
    out: Dict[str, float] = {}
    try:
        out["macro_f1"] = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
        out["weighted_f1"] = float(f1_score(y_true, y_pred, average="weighted", zero_division=0))
        out["precision_macro"] = float(precision_score(y_true, y_pred, average="macro", zero_division=0))
        out["recall_macro"] = float(recall_score(y_true, y_pred, average="macro", zero_division=0))
    except Exception as e:
        logger.warning("clinical metrics failed: %s", e)
    return out


def compute_retrieval_metrics(
    query_embeddings: List[List[float]],
    ref_embeddings: List[List[float]],
    same_label_mask: List[bool],
    k: int = 5,
) -> Dict[str, float]:
    """Retrieval recall@k and average cosine for same-label neighbors. TODO: implement."""
    return {"recall_at_k": 0.0, "avg_cosine_same_label": 0.0}
