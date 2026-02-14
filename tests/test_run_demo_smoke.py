"""Smoke test for run_demo.sh (CI/dummy mode)."""
import os
import shutil
import subprocess
import sys

import pytest


@pytest.mark.skipif(
    sys.platform == "win32" and not shutil.which("bash"),
    reason="bash required for run_demo.sh; skip on Windows without bash",
)
def test_run_demo_ci():
    """run_demo.sh --ci completes without error."""
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    script = os.path.join(root, "scripts", "run_demo.sh")
    result = subprocess.run(
        ["bash", script, "--ci"],
        capture_output=True,
        text=True,
        cwd=root,
    )
    assert result.returncode == 0, f"stdout: {result.stdout}\nstderr: {result.stderr}"
