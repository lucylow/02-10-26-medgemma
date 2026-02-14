"""Tests for adapter loading script (mock mode)."""
import json
import os
import subprocess
import sys


def test_load_and_infer_mock():
    """load_and_infer.py --mock prints valid JSON with risk and summary."""
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    result = subprocess.run(
        [sys.executable, "scripts/load_and_infer.py", "--mock"],
        capture_output=True,
        text=True,
        cwd=root,
    )
    assert result.returncode == 0, result.stderr
    j = json.loads(result.stdout)
    assert "risk" in j
    assert "summary" in j
