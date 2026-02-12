# backend/app/services/benchmark.py
"""
Benchmark simulation: time-to-read reduction from prioritization.
Conservative assumptions for judge/stakeholder demos.
"""
import random
from typing import Any, Dict, List


def simulate_queue(studies: List[Dict[str, Any]]) -> float:
    """
    Simulate average time (minutes) per study in queue.
    STAT: 3–5 min, Urgent: 7–9 min, Routine: 10–14 min.
    """
    if not studies:
        return 0.0

    total = 0.0
    for s in studies:
        p = (s.get("priority_label") or s.get("priority") or "routine").lower()
        if p == "stat":
            t = random.uniform(3, 5)
        elif p == "urgent":
            t = random.uniform(7, 9)
        else:
            t = random.uniform(10, 14)
        total += t

    return total / len(studies)


def benchmark(studies: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Compare baseline (all routine) vs prioritized queue.
    Returns reduction metrics for demos.
    """
    if not studies:
        return {
            "baseline_avg_minutes": 0.0,
            "prioritized_avg_minutes": 0.0,
            "reduction_percent": 0.0,
        }

    # Baseline: treat all as routine
    baseline_studies = [{**s, "priority_label": "routine", "priority": "routine"} for s in studies]
    baseline = simulate_queue(baseline_studies)
    prioritized = simulate_queue(studies)

    reduction = (baseline - prioritized) / baseline * 100 if baseline > 0 else 0.0

    return {
        "baseline_avg_minutes": round(baseline, 2),
        "prioritized_avg_minutes": round(prioritized, 2),
        "reduction_percent": round(reduction, 1),
    }
