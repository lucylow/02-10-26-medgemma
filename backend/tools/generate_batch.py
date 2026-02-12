#!/usr/bin/env python3
"""
Batch generate technical reports from a CSV of screeners.
Usage: python -m tools.generate_batch input.csv [--output out.json] [--no-model]
CSV columns: screening_id, age_months, scores (JSON str), observations [, image_path]
"""
import argparse
import asyncio
import csv
import json
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.db import get_db
from app.services.detailed_writer import generate_technical_report


async def run_batch(csv_path: str, output_path: str | None, use_model: bool) -> None:
    results = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    for i, row in enumerate(rows):
        screening_id = row.get("screening_id", "").strip()
        age_months = int(row.get("age_months", 0))
        try:
            scores = json.loads(row.get("scores", "{}"))
        except json.JSONDecodeError:
            scores = {}
        observations = row.get("observations", "")

        screening_row = {"screening_id": screening_id, "patient_id": row.get("patient_id")}
        tr = await generate_technical_report(
            screening_row,
            age_months,
            scores,
            observations,
            image_summary=None,
            author_id="batch",
            use_model=use_model,
        )

        results.append(tr.dict())
        print(f"[{i + 1}/{len(rows)}] {tr.report_id}")

        # Persist to MongoDB
        try:
            db = get_db()
            await db.reports.insert_one(
                {
                    "report_id": tr.report_id,
                    "screening_id": screening_id,
                    "patient_info": json.dumps({"patient_id": screening_row.get("patient_id")}),
                    "draft_json": tr.dict(),
                    "final_json": None,
                    "status": "draft",
                    "created_at": __import__("time").time(),
                }
            )
        except Exception as e:
            print(f"  Warning: DB insert failed: {e}")

    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, default=str)
        print(f"Wrote {len(results)} reports to {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch generate technical reports from CSV")
    parser.add_argument("input", help="Input CSV path")
    parser.add_argument("-o", "--output", help="Output JSON path")
    parser.add_argument("--no-model", action="store_true", help="Skip model call (deterministic only)")
    args = parser.parse_args()
    asyncio.run(run_batch(args.input, args.output, use_model=not args.no_model))


if __name__ == "__main__":
    main()
