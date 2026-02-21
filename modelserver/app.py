"""
Minimal FastAPI app for modelserver. Replace or extend with your inference logic.
Env: MEDGEMMA_MODEL_PATH, MODEL_SERVER_PORT (default 8000).
"""
import os
from fastapi import FastAPI

app = FastAPI(title="PediScreen Model Server (GPU)")

MODEL_PATH = os.environ.get("MEDGEMMA_MODEL_PATH", "google/medgemma-2b-it")


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_PATH}


@app.get("/status")
def status():
    return {"ready": True, "model": MODEL_PATH}
