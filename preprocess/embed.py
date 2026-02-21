"""
MedSigLIP-style embedding extraction: L2-normalized image features.

Two runtimes: CPU (small batches) and GPU (extract_embeddings_gpu.py / device=cuda).
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import List, Optional

import numpy as np

# Placeholder model name; replace with actual MedSigLIP when available
MODEL_PLACEHOLDER = "medsiglip/medsiglip-base"


def encode_image_cpu(path: str | Path, processor, model, device) -> np.ndarray:
    """Encode single image to L2-normalized vector (CPU or GPU)."""
    from PIL import Image
    import torch

    image = Image.open(path).convert("RGB")
    inputs = processor(images=image, return_tensors="pt").to(device)
    with torch.no_grad():
        out = model.get_image_features(**inputs)
    emb = out.cpu().numpy().astype(np.float32)
    norm = np.linalg.norm(emb, axis=-1, keepdims=True)
    norm = np.where(norm > 0, norm, 1.0)
    emb = emb / norm
    return emb


def encode_images_batch(
    paths: List[Path],
    processor,
    model,
    device,
    batch_size: int = 8,
) -> np.ndarray:
    """Encode a list of images in batches; return (N, dim) L2-normalized."""
    from PIL import Image
    import torch

    all_embs = []
    for i in range(0, len(paths), batch_size):
        batch_paths = paths[i : i + batch_size]
        images = [Image.open(p).convert("RGB") for p in batch_paths]
        inputs = processor(images=images, return_tensors="pt").to(device)
        with torch.no_grad():
            out = model.get_image_features(**inputs)
        emb = out.cpu().numpy().astype(np.float32)
        norm = np.linalg.norm(emb, axis=-1, keepdims=True)
        norm = np.where(norm > 0, norm, 1.0)
        emb = emb / norm
        all_embs.append(emb)
    return np.vstack(all_embs) if all_embs else np.zeros((0, 0), dtype=np.float32)


def load_model_and_processor(model_name: str = MODEL_PLACEHOLDER):
    """Load HuggingFace processor and model (vision encoder). May use trust_remote_code."""
    import torch
    from transformers import AutoProcessor, AutoModel

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    processor = AutoProcessor.from_pretrained(model_name, trust_remote_code=True)
    model = AutoModel.from_pretrained(model_name, trust_remote_code=True).to(device)
    model.eval()
    return processor, model, device


def synthetic_embeddings(n: int, dim: int = 256, seed: int = 42) -> np.ndarray:
    """Produce reproducible L2-normalized random embeddings when no encoder is available."""
    rng = np.random.default_rng(seed)
    emb = rng.standard_normal((n, dim)).astype(np.float32)
    norm = np.linalg.norm(emb, axis=-1, keepdims=True)
    norm = np.where(norm > 0, norm, 1.0)
    return emb / norm


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract L2-normalized image embeddings")
    parser.add_argument("--input", required=True, help="JSONL with image_path or list of image paths")
    parser.add_argument("--out", default="data/embeddings.npy", help="Output .npy path")
    parser.add_argument("--model", default=MODEL_PLACEHOLDER)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--synthetic", action="store_true", help="Skip model; write synthetic L2-normalized vectors")
    parser.add_argument("--synthetic-dim", type=int, default=256)
    args = parser.parse_args()

    # Resolve input: JSONL with image_path column or single column of paths
    input_path = Path(args.input)
    if not input_path.exists():
        raise FileNotFoundError(args.input)
    paths: List[Path] = []
    if input_path.suffix == ".jsonl":
        with open(input_path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                obj = json.loads(line)
                p = obj.get("image_path")
                if p:
                    paths.append(Path(p))
        n = len(paths) if paths else 0
        if n == 0:
            # Count lines for synthetic
            with open(input_path) as f2:
                n = sum(1 for ln in f2 if ln.strip())
            if n == 0:
                print("No image_path in JSONL and no lines; use --input with a directory or list of paths")
                return
            paths = []  # will use synthetic
    else:
        paths = [Path(args.input)]
        n = len(paths)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    if args.synthetic or not paths:
        n_emb = len(paths) if paths else (n or 1)
        embeddings = synthetic_embeddings(n_emb, dim=args.synthetic_dim)
        np.save(out_path, embeddings)
        print(f"Saved synthetic {embeddings.shape} to {out_path}")
        return

    try:
        processor, model, device = load_model_and_processor(args.model)
    except Exception as e:
        print(
            "Model load failed (MedSigLIP may be unavailable). "
            "Writing synthetic embeddings instead. Use --synthetic for demos."
        )
        embeddings = synthetic_embeddings(len(paths), dim=args.synthetic_dim)
        np.save(out_path, embeddings)
        print(f"Saved synthetic {embeddings.shape} to {out_path}")
        return

    embeddings = encode_images_batch(paths, processor, model, device, args.batch_size)
    np.save(out_path, embeddings)
    print(f"Saved {embeddings.shape} to {out_path}")


if __name__ == "__main__":
    main()
