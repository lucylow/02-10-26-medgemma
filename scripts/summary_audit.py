#!/usr/bin/env python
"""
Summarize audit log: count entries, fallback rate, errors.
Usage: python scripts/summary_audit.py [--path PATH]
"""
import argparse
import json
import os
from pathlib import Path

AUDIT_PATH = os.getenv("AUDIT_LOG_PATH", "data/audit_log.jsonl")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", default=AUDIT_PATH, help="Path to audit JSONL file")
    args = parser.parse_args()

    path = Path(args.path)
    if not path.exists():
        print(f"No audit file at {path}")
        return

    total = 0
    fallbacks = 0
    errors = 0
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
                total += 1
                if entry.get("fallback_used"):
                    fallbacks += 1
                if entry.get("status") == "error":
                    errors += 1
            except json.JSONDecodeError:
                pass

    print(f"Total entries: {total}")
    print(f"Fallback used: {fallbacks}")
    print(f"Errors: {errors}")
    if total > 0:
        print(f"Fallback rate: {100 * fallbacks / total:.1f}%")


if __name__ == "__main__":
    main()
