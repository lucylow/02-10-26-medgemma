# embed_server/app.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from PIL import Image
import io, base64, numpy as np
from loguru import logger

app = FastAPI(title="Mock MedSigLIP Embed Server")

class EmbResp(BaseModel):
    embedding_b64: str
    shape: list
    emb_version: str = "mock-medsiglip-v1"

def _mock_embedding_from_bytes(b: bytes, dim: int = 256):
    import numpy as np
    seed = int.from_bytes(base64.b16encode(b)[:8], "little") % (2**32)
    rng = np.random.RandomState(seed)
    arr = rng.normal(size=(1, dim)).astype("float32")
    arr = arr / (np.linalg.norm(arr, axis=-1, keepdims=True) + 1e-12)
    return arr

@app.post("/embed", response_model=EmbResp)
async def embed(file: UploadFile = File(...)):
    try:
        b = await file.read()
        arr = _mock_embedding_from_bytes(b)
        b64 = base64.b64encode(arr.tobytes()).decode("ascii")
        return {"embedding_b64": b64, "shape": list(arr.shape), "emb_version": "mock-medsiglip-v1"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/health")
def health(): return {"ok": True}
