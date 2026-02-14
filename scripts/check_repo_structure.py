#!/usr/bin/env python3
"""
Repo structure checklist — confirms expected files exist (Page 2).
Run from repo root: python scripts/check_repo_structure.py
"""
import os
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EXPECTED = [
    "backend/app/services/medgemma_service.py",
    "backend/app/api/infer.py",
    "backend/app/utils/embeddings.py",
    "backend/app/services/embedding_utils.py",
    "backend/requirements.txt",
    "backend/tests/test_embeddings.py",
    "backend/tests/test_medgemma_service.py",
    "model-server/app/medgemma_service.py",
    "model-server/app/main.py",
    "model-server/app/utils/embeddings.py",
    "README.md",
    "backend/docker-compose.yml",
    ".github/workflows/ci.yml",
    ".pre-commit-config.yaml",
]

OPTIONAL = [
    "RUNBOOK_IMPROVE_MODEL_QUALITY.md",
    "RUNBOOK.md",
    "verify_privacy.py",
    "eval/run_eval.py",
]


def main():
    os.chdir(REPO_ROOT)
    missing = []
    for p in EXPECTED:
        if not os.path.exists(p):
            missing.append(p)
    if missing:
        print("MISSING (required):")
        for m in missing:
            print(f"  - {m}")
        sys.exit(1)
    print("All required files present.")
    for p in OPTIONAL:
        status = "OK" if os.path.exists(p) else "absent"
        print(f"  {p}: {status}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
