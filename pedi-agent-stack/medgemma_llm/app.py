# medgemma_llm/app.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline
import os, logging
from loguru import logger

MODEL_NAME = os.getenv("MODEL_NAME", "google/flan-t5-small")
app = FastAPI(title="Local MedGemma LLM (demo)") 

logger.info("Loading model {}", MODEL_NAME)
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
gen = pipeline("text2text-generation", model=model, tokenizer=tokenizer, device=-1)  # CPU

class InferReq(BaseModel):
    age_months: int
    observations: str
    features: dict = {}
    temporal: dict = {}

@app.post("/infer")
def infer(req: InferReq):
    # Build constrained prompt
    prompt = (
        f"You are a conservative pediatric screening assistant. Do NOT diagnose. "
        f"Given age {req.age_months} months, observations: {req.observations}. "
        f"Features: {req.features}. Temporal: {req.temporal}. "
        f"Produce JSON with keys summary (list), risk (low|monitor|elevated), rationale, next_steps (list), confidence (0-1)."
    )
    try:
        out = gen(prompt, max_length=256, do_sample=False)[0]["generated_text"]
        # For demo, return text in json under "text" and a mock parse
        # In prod you'd parse JSON from the model output (prompt it to output strict JSON)
        return {"text": out, "adapter_id": "demo-flan", "model_version": MODEL_NAME}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health(): return {"ok": True, "model": MODEL_NAME}
