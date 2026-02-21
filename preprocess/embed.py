"""
preprocess/embed.py

Embedding extraction pipeline.

Primary behavior:
- If a model name/path is provided and transformers is available, attempt to load an image processor + model (MedSigLIP-like).
- Otherwise, fall back to a deterministic pseudo-embedding generator for CI and demos.

Outputs:
- Numpy L2-normalized float32 vectors (shape: (1, D)) saved to .npy or returned as numpy arrays.
- Optional base64 encoded payload helper.
"""

import argparse
import base64
import hashlib
import logging
from typing import Optional

import numpy as np

from preprocess.image import (
    load_image_rgb,
    normalize_image_float32,
    resize_and_center_crop,
    to_numpy_uint8,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def l2_normalize(arr: np.ndarray, eps: float = 1e-12) -> np.ndarray:
    """L2-normalize a numpy array over the last axis."""
    norm = np.linalg.norm(arr, axis=-1, keepdims=True)
    norm = np.maximum(norm, eps)
    return arr / norm


def pseudo_embedding_from_image(img_bytes: bytes, dim: int = 256) -> np.ndarray:
    """
    Deterministic pseudo-embedding derived from an image bytes hash.
    Useful for CI/demos when model weights are not available.
    """
    h = hashlib.sha256(img_bytes).digest()
    rng = np.frombuffer(h * ((dim // len(h)) + 1), dtype=np.uint8)[:dim].astype("float32")
    rng = (rng / 255.0) * 2.0 - 1.0
    emb = rng.reshape((1, dim))
    emb = l2_normalize(emb)
    return emb.astype("float32")


def embedding_to_b64_float32(emb: np.ndarray) -> str:
    """Encode float32 numpy array to base64 of raw bytes."""
    return base64.b64encode(emb.tobytes()).decode("ascii")


def extract_embedding_from_image_path(
    image_path: str,
    model_name: Optional[str] = None,
    target_size: tuple = (224, 224),
    dim: int = 256,
):
    """
    Try to produce an embedding for an image.

    If model_name is provided and transformers is importable, attempt real model extraction,
    otherwise fall back to pseudo deterministic embedding.

    Returns:
        numpy array shape (1, dim) float32, L2-normalized
    """
    img = load_image_rgb(image_path)
    img = resize_and_center_crop(img, target_size)
    arr_uint8 = to_numpy_uint8(img)
    try:
        from transformers import AutoModel, AutoProcessor
        import torch
    except Exception:
        logger.info("transformers or torch not available — using pseudo embedding")
        with open(image_path, "rb") as f:
            img_bytes = f.read()
        return pseudo_embedding_from_image(img_bytes, dim=dim)

    if model_name is None:
        logger.info("No model_name provided — using pseudo embedding")
        with open(image_path, "rb") as f:
            return pseudo_embedding_from_image(f.read(), dim=dim)

    try:
        processor = AutoProcessor.from_pretrained(model_name, trust_remote_code=True)
        model = AutoModel.from_pretrained(model_name, trust_remote_code=True)
        model.eval()
        inputs = processor(images=img, return_tensors="pt", padding=True)
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(device)
        inputs = {k: v.to(device) for k, v in inputs.items()}
        with torch.no_grad():
            out = (
                model.get_image_features(**inputs)
                if hasattr(model, "get_image_features")
                else model(**inputs).last_hidden_state
            )
        emb = out.cpu().numpy()
        if emb.ndim == 3:
            emb = emb.mean(axis=1)
        emb = emb.astype("float32")
        emb = l2_normalize(emb)
        if emb.shape[-1] != dim:
            logger.info(
                "Embedding size %d differs from requested %d — applying deterministic transform",
                emb.shape[-1],
                dim,
            )
            rng = np.random.RandomState(0)
            W = rng.randn(emb.shape[-1], dim).astype("float32")
            emb = np.dot(emb, W)
            emb = l2_normalize(emb)
        return emb.astype("float32")
    except Exception as e:
        logger.exception("Model extraction failed, falling back to pseudo embedding: %s", e)
        with open(image_path, "rb") as f:
            return pseudo_embedding_from_image(f.read(), dim=dim)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", "-i", required=True, help="input image path (PNG/JPG)")
    parser.add_argument("--out", "-o", required=True, help="output .npy path for embedding")
    parser.add_argument("--model_name", "-m", default=None, help="optional model name/path for real extraction")
    parser.add_argument("--dim", type=int, default=256, help="embedding dimension (default 256)")
    parser.add_argument("--size", type=int, default=224, help="image target size (square)")
    args = parser.parse_args()

    emb = extract_embedding_from_image_path(
        args.input,
        model_name=args.model_name,
        target_size=(args.size, args.size),
        dim=args.dim,
    )
    np.save(args.out, emb)
    print(f"Saved embedding to {args.out} with shape {emb.shape} and dtype {emb.dtype}")


if __name__ == "__main__":
    main()
