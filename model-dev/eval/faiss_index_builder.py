"""
FAISS index builder for explainability (model-dev).

Purpose: Build index from training/validation embeddings + de-identified metadata;
save .faiss + _metadata.json for reasoner-server nearest-neighbor lookup.
Inputs: Embeddings file or dataset path, metadata (id, snippet). Outputs: index.faiss, index_metadata.json.
Usage:
  python model-dev/eval/faiss_index_builder.py --embeddings embeddings.npy --metadata metadata.jsonl --output model-dev/artifacts/faiss/index
"""
from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--embeddings", required=True, help=".npy or path to embedding matrix")
    parser.add_argument("--metadata", required=True, help="JSONL: id, snippet (de-identified)")
    parser.add_argument("--output", required=True, help="Output prefix: {output}.faiss, {output}_metadata.json")
    args = parser.parse_args()
    # TODO: Load embeddings (numpy), build faiss.IndexFlatIP or IndexFlatL2, add vectors; load metadata; save
    items = []
    with open(args.metadata, "r", encoding="utf-8") as f:
        for line in f:
            items.append(json.loads(line.strip()))
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    meta_path = str(out_path) + "_metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump({"items": items}, f, indent=2)
    logger.info("Metadata written to %s (FAISS index build stub)", meta_path)


if __name__ == "__main__":
    main()
