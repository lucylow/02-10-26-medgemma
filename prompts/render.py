"""
Render canonical prompts by prompt_id; return filled prompt with metadata and prompt_hash.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

PROMPTS_DIR = Path(__file__).resolve().parent
TEMPLATE_SUMMARY = (
    "Provide a short clinical summary (2-4 bullets), a risk level, and 3 actionable recommendations."
)
TEMPLATE_ZERO = "Based on the following developmental observations, provide a risk level (on_track, monitor, discuss, or refer) and a brief rationale.\n\nObservations: {observations}"
TEMPLATE_FEW = "Example: Observations: {example_obs}\nRisk: {example_risk}\n\nNow:\nObservations: {observations}"


def prompt_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def render(prompt_id: str, **kwargs) -> dict:
    """Return filled prompt with metadata and prompt_hash."""
    if prompt_id == "clinical_summary":
        text = TEMPLATE_SUMMARY
    elif prompt_id == "zero_shot":
        text = TEMPLATE_ZERO.format(observations=kwargs.get("observations", ""))
    elif prompt_id == "few_shot":
        text = TEMPLATE_FEW.format(
            example_obs=kwargs.get("example_obs", ""),
            example_risk=kwargs.get("example_risk", "monitor"),
            observations=kwargs.get("observations", ""),
        )
    else:
        # Load from eval_prompts.jsonl if present
        eval_path = PROMPTS_DIR / "eval_prompts.jsonl"
        if eval_path.exists():
            for line in open(eval_path):
                line = line.strip()
                if not line:
                    continue
                obj = json.loads(line)
                if obj.get("id") == prompt_id or obj.get("prompt_id") == prompt_id:
                    text = obj.get("prompt", obj.get("text", ""))
                    for k, v in kwargs.items():
                        text = text.replace("{" + k + "}", str(v))
                    break
            else:
                text = f"Unknown prompt_id: {prompt_id}"
        else:
            text = f"Unknown prompt_id: {prompt_id}"
    return {
        "prompt_id": prompt_id,
        "text": text,
        "prompt_hash": prompt_hash(text),
        "metadata": kwargs,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt_id", "-p", required=True, help="e.g. zero_shot, clinical_summary, or id from eval_prompts.jsonl")
    parser.add_argument("--observations", default="", help="For zero_shot/few_shot")
    parser.add_argument("--example_obs", default="")
    parser.add_argument("--example_risk", default="monitor")
    args = parser.parse_args()
    out = render(
        args.prompt_id,
        observations=args.observations,
        example_obs=args.example_obs,
        example_risk=args.example_risk,
    )
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
