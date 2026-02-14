# embed_server/app.py
"""
MedSigLIP embedding server. Accepts multipart image, returns base64 float32 embedding.
Run: uvicorn embed_server.app:app --host 0.0.0.0 --port 5000
Env: USE_DUMMY=1 to skip model load (CI/quick runs)
"""
import argparse
import base64
import io
import os

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from loguru import logger
from PIL import Image

app = FastAPI(title="MedSigLIP Embed Server")

MODEL_NAME = os.getenv("MEDSIGLIP_MODEL", os.getenv("MEDSIGLIP_MODEL_NAME", "google/medsiglip-base"))
USE_DUMMY = os.getenv("USE_DUMMY", "0") == "1" or os.getenv("USE_REAL_MEDSIGLIP", "1") == "0"
device = None
processor = None
model = None


def _mock_embedding_from_bytes(b: bytes, dim: int = 256):
    seed = int.from_bytes(base64.b16encode(b)[:8], "little") % (2**32)
    rng = np.random.RandomState(seed)
    arr = rng.normal(size=(1, dim)).astype("float32")
    arr = arr / (np.linalg.norm(arr, axis=-1, keepdims=True) + 1e-12)
    return arr


def _load_medsiglip():
    global device, processor, model
    if processor is not None:
        return
    import torch

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("Loading MedSigLIP model: {}", MODEL_NAME)
    try:
        from transformers import AutoImageProcessor, AutoModel

        processor = AutoImageProcessor.from_pretrained(MODEL_NAME, trust_remote_code=True)
        model = AutoModel.from_pretrained(MODEL_NAME, trust_remote_code=True).to(device)
        model.eval()
        logger.info("MedSigLIP loaded on {}", device)
    except Exception as e:
        logger.warning("MedSigLIP load failed, using mock: {}", e)
        processor = None
        model = None


def _tensor_to_base64_float32(t):
    import torch

    arr = t.detach().cpu().numpy().astype(np.float32)
    b = arr.tobytes()
    return base64.b64encode(b).decode("ascii"), list(arr.shape)


@app.on_event("startup")
async def startup():
    if not USE_DUMMY:
        _load_medsiglip()
    else:
        logger.info("USE_DUMMY=1: skipping model load, using mock embeddings")


@app.get("/health")
def health():
    """Health endpoint with status, model name, and device."""
    import torch

    dev = device
    if dev is None:
        dev = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "device": str(dev.type),
        "model_loaded": model is not None,
        "use_dummy": USE_DUMMY,
    }


@app.post("/embed")
async def embed(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        pil = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"bad image: {e}")

    if processor is not None and model is not None:
        import torch

        inputs = processor(images=pil, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = model(**inputs)
            if hasattr(outputs, "pooler_output") and outputs.pooler_output is not None:
                emb = outputs.pooler_output
            else:
                emb = outputs.last_hidden_state.mean(dim=1)
            emb = torch.nn.functional.normalize(emb, dim=-1)
            b64, shape = _tensor_to_base64_float32(emb)
        return JSONResponse(
            {"embedding_b64": b64, "shape": shape, "emb_version": "medsiglip-v1"}
        )
    else:
        arr = _mock_embedding_from_bytes(contents)
        b64 = base64.b64encode(arr.tobytes()).decode("ascii")
        return JSONResponse(
            {
                "embedding_b64": b64,
                "shape": list(arr.shape),
                "emb_version": "mock-medsiglip-v1",
            }
        )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--use-dummy", action="store_true", help="Skip model load, use mock embeddings")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=5000)
    args, _ = parser.parse_known_args()
    if args.use_dummy:
        os.environ["USE_DUMMY"] = "1"
    import uvicorn

    uvicorn.run("embed_server.app:app", host=args.host, port=args.port)


if __name__ == "__main__":
    main()
