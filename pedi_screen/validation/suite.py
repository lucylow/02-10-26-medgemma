"""
Validation suite — orchestrate evaluation runs, load labelled test sets, output reports.
"""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from .tests.benchmark_tests import run_benchmark_tests
from .tests.bias_audit import run_bias_audit
from .tests.json_schema_validator import validate_json_schema
from .tests.safety_audit import run_safety_audit


def run_validation_suite(
    test_data_path: Optional[str] = None,
    output_dir: Optional[str] = None,
    modalities: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Run full validation suite: benchmark + bias audit.
    Returns summary dict and writes CSV/JSON reports to output_dir.
    """
    modalities = modalities or ["text", "multimodal"]
    output_dir = output_dir or os.path.join(os.getcwd(), "validation_reports")
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    # Resolve test data path
    base = Path(__file__).parent.parent.parent
    candidates = [
        test_data_path,
        os.path.join(base, "data", "validation_set"),
        os.path.join(base, "backend", "..", "data", "validation_set"),
    ]
    data_path = None
    for p in candidates:
        if p and os.path.isdir(p):
            data_path = p
            break

    results: Dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "modalities": modalities,
        "test_data_path": data_path,
        "benchmark": {},
        "bias_audit": {},
        "json_compliance": 0.0,
        "safety_audit": {},
    }

    # Run benchmark tests
    benchmark = run_benchmark_tests(data_path=data_path, modalities=modalities)
    results["benchmark"] = benchmark

    # Run bias audit
    bias = run_bias_audit(data_path=data_path)
    results["bias_audit"] = bias

    # JSON schema compliance and safety audit (if model_outputs.json exists)
    if data_path:
        out_path = os.path.join(data_path, "model_outputs.json")
        if os.path.isfile(out_path):
            try:
                with open(out_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                outputs = data.get("outputs", [])
                if outputs and isinstance(outputs[0], dict):
                    results["json_compliance"] = validate_json_schema(outputs)
                    results["safety_audit"] = run_safety_audit(outputs)
            except Exception:
                pass

    # Write reports
    summary_path = os.path.join(output_dir, "validation_summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    # CSV for metrics
    csv_path = os.path.join(output_dir, "metrics.csv")
    _write_metrics_csv(results, csv_path)

    return results


def _write_metrics_csv(results: Dict[str, Any], path: str) -> None:
    """Write metrics to CSV for dashboard import."""
    rows = []
    b = results.get("benchmark", {})
    for mod, m in b.items():
        if isinstance(m, dict):
            rows.append(f"benchmark,{mod},sensitivity,{m.get('sensitivity', '')}")
            rows.append(f"benchmark,{mod},specificity,{m.get('specificity', '')}")
            rows.append(f"benchmark,{mod},ppv,{m.get('ppv', '')}")
            rows.append(f"benchmark,{mod},npv,{m.get('npv', '')}")
    with open(path, "w", encoding="utf-8") as f:
        f.write("category,modality,metric,value\n")
        f.write("\n".join(rows))
