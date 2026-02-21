#!/usr/bin/env python3
"""
IRB Submission Packet Generator — PediScreen AI.

Copies protocol, consent, data security, and risk-benefit templates into a
timestamped folder for a given study name. Edit the generated files and
submit to your IRB.

Usage:
  python irb/generate_irb_packet.py MyStudy
  python irb/generate_irb_packet.py "Prospective AI Screening Trial"
"""
from __future__ import annotations

import argparse
import os
import shutil
from datetime import datetime
from pathlib import Path

IRB_DIR = Path(__file__).resolve().parent
TEMPLATES = [
    "consent_form_template.md",
    "protocol_template.md",
    "data_security_plan.md",
    "risk_benefit_analysis.md",
]


def generate_packet(study_name: str, output_dir: Path | None = None) -> Path:
    """
    Create a timestamped folder and copy all template files into it.
    Returns the path to the created folder.
    """
    safe_name = "".join(c if c.isalnum() or c in " -_" else "_" for c in study_name).strip().replace(" ", "_")
    date_str = datetime.utcnow().date().isoformat()
    folder_name = f"{safe_name}_{date_str}"
    if output_dir is None:
        output_dir = IRB_DIR
    folder = output_dir / folder_name
    folder.mkdir(parents=True, exist_ok=True)

    for name in TEMPLATES:
        src = IRB_DIR / name
        if not src.exists():
            print(f"Warning: template not found {src}")
            continue
        dst = folder / name
        shutil.copy2(src, dst)
        print(f"  {name} -> {dst}")

    readme = folder / "README.txt"
    readme.write_text(
        f"IRB packet for: {study_name}\n"
        f"Generated: {datetime.utcnow().isoformat()}Z\n"
        f"Edit the .md files and submit per your institution's IRB process.\n",
        encoding="utf-8",
    )
    print(f"  README.txt -> {readme}")

    return folder


def main():
    parser = argparse.ArgumentParser(description="Generate IRB submission packet for PediScreen AI study")
    parser.add_argument("study_name", nargs="?", default="PediScreen_AI_Study", help="Study name (used in folder name)")
    parser.add_argument("-o", "--output-dir", type=Path, default=None, help="Output directory (default: irb/)")
    args = parser.parse_args()

    folder = generate_packet(args.study_name, args.output_dir)
    print(f"\nIRB packet created at: {folder}")
    print("Next: edit the .md files and add any institution-specific forms, then submit to IRB.")


if __name__ == "__main__":
    main()
