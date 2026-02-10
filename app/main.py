from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from PIL import Image
import io
from models.medsiglip_service import MedSigLIPService
from models.medgemma_service import MedGemmaService
from config.settings import settings

app = FastAPI(title="PediScreen AI API")
medsig = MedSigLIPService()
medgemma = MedGemmaService()

@app.post("/analyze")
async def analyze_screening(
    child_age: int = Form(...),
    observations: str = Form(...),
    image: UploadFile = File(None)
):
    if image:
        contents = await image.read()
        try:
            pil = Image.open(io.BytesIO(contents)).convert("RGB")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Bad image: {e}")
    else:
        pil = None

    try:
        if not pil:
            # run text-only prompt (MedGemma still useful)
            result = medgemma.infer(pil_image=None, age_months=child_age, observations=observations)
        else:
            result = medgemma.infer(pil_image=pil, age_months=child_age, observations=observations)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze_with_embedding")
async def analyze_with_embedding(
    child_age: int = Form(...),
    observations: str = Form(...),
    image: UploadFile = File(...)
):
    contents = await image.read()
    try:
        pil = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Bad image: {e}")

    # 1) compute embedding with MedSigLIP
    try:
        emb = medsig.image_to_embedding(pil)  # returns torch tensor (hidden_dim,) or (1,hidden_dim)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {e}")

    # 2) pass precomputed embedding to MedGemma
    try:
        result = medgemma.infer(
            pil_image=None,
            precomputed_image_emb=emb,
            age_months=child_age,
            observations=observations,
            max_new_tokens=256
        )
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok"}
