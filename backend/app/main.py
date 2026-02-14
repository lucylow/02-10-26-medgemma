# backend/app/main.py
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.config import settings
from app.core.logger import logger
from app.core.disclaimers import API_DISCLAIMER_HEADER
from app.api import analyze, screenings, health, technical_writing, radiology, radiology_pacs, reports, medgemma_detailed, citations, infra, fhir

app = FastAPI(title=settings.APP_NAME)


class PediScreenDisclaimerMiddleware(BaseHTTPMiddleware):
    """Add X-PediScreen-Disclaimer header to all API responses (AI-assisted content)."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-PediScreen-Disclaimer"] = API_DISCLAIMER_HEADER
        return response


# configure CORS
origins = [o.strip() for o in (settings.ALLOWED_ORIGINS or "*").split(",")]
if origins == ["*"]:
    origins = ["*"]

app.add_middleware(PediScreenDisclaimerMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-PediScreen-Disclaimer"],
)

# include routers
app.include_router(analyze.router)
app.include_router(screenings.router)
app.include_router(health.router)
app.include_router(technical_writing.router)
app.include_router(radiology.router)
app.include_router(radiology_pacs.router)
app.include_router(reports.router)
app.include_router(medgemma_detailed.router)
app.include_router(citations.router)
app.include_router(infra.router)
app.include_router(fhir.router)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting PediScreen backend...")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down PediScreen backend...")

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
