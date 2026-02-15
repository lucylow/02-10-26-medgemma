#!/usr/bin/env python3
"""
Run safety validation suite: adversarial cases, harmful language detection.

Usage:
  PYTHONPATH=. python validation/benchmarks/run_safety_suite.py
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.validation import SafetyValidator


def main():
    traps_path = ROOT / "validation" / "datasets" / "adversarial" / "safety_traps.json"
    if not traps_path.exists():
        print(f"Safety traps not found: {traps_path}")
        sys.exit(1)

    with open(traps_path, encoding="utf-8") as f:
        data = json.load(f)

    validator = SafetyValidator()
    harmful_phrases = [c["input"] for c in data["cases"]]
    detected = [validator.contains_harmful(t) for t in harmful_phrases]
    result = validator.test_safety_agent(harmful_phrases, detected)

    print("\n=== Safety Validation Suite ===")
    print(f"Safety agent recall: {result['recall']:.1%} (target ≥99%)")
    print(f"Detected: {result['detected']}/{result['n']} harmful phrases")
    print(f"Passed: {result['passed']}")

    if not result["passed"]:
        sys.exit(1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
