"""
Synthetic evaluation data generator — reproducible test set for PediScreen eval.
Creates gold_standard.json and model_outputs.json for CI and Kaggle reproducibility.
"""
import json
import random
from pathlib import Path
from typing import Any, Dict, List, Literal

RiskLevel = Literal["low", "on_track", "monitor", "elevated", "discuss", "refer"]


def generate_synthetic_eval_data(
    n_cases: int = 100,
    output_dir: str = "data/validation_set",
    seed: int = 42,
) -> Dict[str, Any]:
    """
    Generate synthetic gold standard and model predictions for evaluation.
    Returns the generated data dict.
    """
    random.seed(seed)
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    domains = ["language", "motor", "social", "cognitive"]
    risk_levels: List[RiskLevel] = ["low", "on_track", "monitor", "elevated", "discuss", "refer"]
    # Weight toward lower risk (realistic distribution)
    risk_weights = [0.35, 0.25, 0.20, 0.10, 0.07, 0.03]

    cases = []
    for i in range(n_cases):
        age = random.randint(6, 60)
        domain = random.choice(domains)
        risk = random.choices(risk_levels, weights=risk_weights)[0]
        cases.append({
            "case_id": f"eval-{i:04d}",
            "age_months": age,
            "domain": domain,
            "observations": _fake_observations(domain, risk),
            "image_path": None,
            "clinician_label": {
                "risk": risk,
                "rationale": f"Clinician assessment for {domain} domain.",
                "next_steps": ["Continue monitoring"] if risk in ("low", "on_track") else ["Consider follow-up screening"],
            },
        })

    # Simulate model predictions (with controlled noise for reproducibility)
    predictions = _simulate_predictions(cases, seed)
    model_outputs = _simulate_model_outputs(cases, predictions, seed)

    gold_path = Path(output_dir) / "gold_standard.json"
    with open(gold_path, "w", encoding="utf-8") as f:
        json.dump({"cases": cases, "predictions": predictions}, f, indent=2)

    outputs_path = Path(output_dir) / "model_outputs.json"
    with open(outputs_path, "w", encoding="utf-8") as f:
        json.dump({"outputs": model_outputs}, f, indent=2)

    return {"cases": cases, "predictions": predictions, "model_outputs": model_outputs}


def _fake_observations(domain: str, risk: str) -> str:
    """Generate plausible caregiver observations."""
    if risk in ("low", "on_track"):
        obs = {
            "language": "Child uses many words and short sentences.",
            "motor": "Walks and runs steadily. Climbs stairs with support.",
            "social": "Plays with other children. Shares toys sometimes.",
            "cognitive": "Follows simple instructions. Points to pictures.",
        }
    elif risk == "monitor":
        obs = {
            "language": "Uses some words. Sentences are short.",
            "motor": "Walks but sometimes unsteady. Prefers crawling.",
            "social": "Plays alongside others. Limited interaction.",
            "cognitive": "Follows 1-step directions. Emerging pointing.",
        }
    else:
        obs = {
            "language": "Few words. Mostly gestures.",
            "motor": "Not yet walking independently.",
            "social": "Limited eye contact. Prefers solitary play.",
            "cognitive": "Difficulty following directions.",
        }
    return obs.get(domain, "Parent reports typical development.")


def _simulate_predictions(cases: List[Dict], seed: int) -> Dict[str, List[str]]:
    """Simulate predictions from 4 baselines with controlled noise."""
    random.seed(seed)
    gold = [c["clinician_label"]["risk"] for c in cases]
    models = ["base_medgemma", "finetuned_lora", "deterministic", "text", "multimodal"]

    out: Dict[str, List[str]] = {}
    # Base MedGemma: ~65% agreement, tends to miss concerns
    out["base_medgemma"] = [
        gold[i] if random.random() < 0.65 else random.choice(["low", "monitor", "elevated"])
        for i in range(len(cases))
    ]
    # Fine-tuned: ~89% agreement
    out["finetuned_lora"] = [
        gold[i] if random.random() < 0.89 else random.choice(["low", "monitor", "elevated"])
        for i in range(len(cases))
    ]
    # Deterministic: high sensitivity, lower specificity
    out["deterministic"] = [
        gold[i] if random.random() < 0.85 else ("elevated" if gold[i] in ("elevated", "discuss", "refer") else "monitor")
        for i in range(len(cases))
    ]
    out["text"] = out["finetuned_lora"]
    out["multimodal"] = out["finetuned_lora"]
    return out


def _simulate_model_outputs(
    cases: List[Dict], predictions: Dict[str, List[str]], seed: int
) -> List[Dict[str, Any]]:
    """Generate valid PediScreen JSON outputs for compliance/safety audit."""
    random.seed(seed)
    outputs = []
    for i, case in enumerate(cases):
        risk = predictions.get("finetuned_lora", [])[i] if i < len(predictions.get("finetuned_lora", [])) else "monitor"
        outputs.append({
            "risk": risk,
            "summary": f"Screening summary for {case['domain']} domain.",
            "rationale": "Patterns suggest monitoring. Consider follow-up screening with clinician.",
            "next_steps": ["Continue routine monitoring"] if risk in ("low", "on_track") else ["Discuss with clinician", "Consider formal evaluation"],
            "confidence": round(0.6 + random.random() * 0.35, 2),
        })
    return outputs


if __name__ == "__main__":
    import argparse
    _base = Path(__file__).resolve().parent.parent.parent
    _default_out = str(_base / "data" / "validation_set")
    parser = argparse.ArgumentParser(description="Generate synthetic eval data")
    parser.add_argument("--n", type=int, default=100, help="Number of cases")
    parser.add_argument("--out", default=_default_out, help="Output directory")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()
    generate_synthetic_eval_data(n_cases=args.n, output_dir=args.out, seed=args.seed)
    print(f"Generated {args.n} cases in {args.out}")
