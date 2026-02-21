"""
Knowledge distillation for edge models (model-dev).

Purpose: Teacher (adapter+base) -> student (smaller transformer); loss = KL(logits) + MSE(embeddings) + supervised.
Inputs: Teacher path, student config, dataset. Outputs: Student checkpoint.
Usage:
  python model-dev/distill/distill_script.py --teacher_path ... --student_config model-dev/distill/distill_config.yaml
"""
from __future__ import annotations

import argparse
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--teacher_path", required=True)
    parser.add_argument("--student_config", default="model-dev/distill/distill_config.yaml")
    parser.add_argument("--dataset_path", required=True)
    parser.add_argument("--output_dir", default="model-dev/artifacts/student")
    args = parser.parse_args()
    # TODO: Load teacher, build student, train with KL + MSE + CE, save student
    logger.info("Distill: teacher=%s -> output=%s (stub)", args.teacher_path, args.output_dir)
    Path(args.output_dir).mkdir(parents=True, exist_ok=True)


if __name__ == "__main__":
    main()
