# backend/app/main.py
import uvicorn
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.config import settings
from app.core.logger import logger
from app.core.disclaimers import API_DISCLAIMER_HEADER
from app.core.legal_middleware import LegalMiddleware
from app.core.request_id_middleware import RequestIDMiddleware, get_request_id
from app.middleware.phi_guard import PHIGuardMiddleware
from app.api import (
    analyze,
    stream_analyze,
    infer,
    screenings,
    screening_v1,
    screening_v2,
    health,
    technical_writing,
    radiology,
    radiology_pacs,
    reports,
    medgemma_detailed,
    citations,
    infra,
    fhir,
    epic_fhir,
    consent,
    dsr,
    embed,
    schemas_api,
    data_quality,
    interoperability,
    feedback,
    telemetry,
)
from app.errors import ErrorResponse, ErrorCodes
from app.utils.error_formatter import api_error

app = FastAPI(title=settings.APP_NAME)


def _status_to_code(status_code: int) -> str:
    """Map HTTP status to default error code."""
    return {
        400: ErrorCodes.INVALID_PAYLOAD,
        401: ErrorCodes.AUTH_FAIL,
        403: ErrorCodes.AUTH_FAIL,
        404: ErrorCodes.NOT_FOUND,
        422: ErrorCodes.VALIDATION_ERROR,
        500: ErrorCodes.SAFE_ERROR,
        503: ErrorCodes.SERVICE_UNAVAILABLE,
    }.get(status_code, ErrorCodes.SAFE_ERROR)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Convert Pydantic validation errors to standardized ErrorResponse."""
    errors = exc.errors()
    details = {"validation_errors": errors}
    return api_error(
        ErrorCodes.VALIDATION_ERROR,
        "Request validation failed",
        status_code=422,
        details=details,
        request_id=get_request_id(request),
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all: convert to standardized ErrorResponse."""
    from fastapi import HTTPException
    from app.errors import ApiError, SafetyViolation

    if isinstance(exc, ApiError):
        return api_error(exc.code, exc.message, exc.status_code, exc.details)
    if isinstance(exc, SafetyViolation):
        return api_error(
            ErrorCodes.SAFETY_VIOLATION,
            f"Safety violation: {exc.violation_type}",
            status_code=422,
            details={"severity": exc.severity, "mitigation_applied": exc.mitigation_applied},
            request_id=get_request_id(request),
        )
    if isinstance(exc, HTTPException):
        detail = exc.detail
        if isinstance(detail, dict) and "code" in detail:
            return api_error(
                detail.get("code", _status_to_code(exc.status_code)),
                detail.get("message", str(detail)),
                exc.status_code,
                detail.get("details"),
            )
        return api_error(
            _status_to_code(exc.status_code),
            str(detail) if detail else "An error occurred",
            exc.status_code,
        )
    logger.exception("Unhandled exception: %s", exc)
    return api_error(
        ErrorCodes.SAFE_ERROR,
        "An unexpected error occurred",
        status_code=500,
    )

# Request ID first so all downstream code has request.state.request_id
app.add_middleware(RequestIDMiddleware)
# HIPAA: block PHI from entering AI/telemetry routes (strict schema enforcement)
app.add_middleware(PHIGuardMiddleware)
# Legal middleware: audit, PHI enforcement, disclaimer, policy scan
app.add_middleware(LegalMiddleware)


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
app.include_router(stream_analyze.router)
app.include_router(infer.router)
app.include_router(screenings.router)
app.include_router(screening_v1.router)
app.include_router(screening_v2.router)
app.include_router(health.router)
app.include_router(technical_writing.router)
app.include_router(radiology.router)
app.include_router(radiology_pacs.router)
app.include_router(reports.router)
app.include_router(medgemma_detailed.router)
app.include_router(citations.router)
app.include_router(infra.router)
app.include_router(fhir.router)
app.include_router(epic_fhir.router)
app.include_router(telemetry.router)
app.include_router(consent.router)
app.include_router(dsr.router)
app.include_router(embed.router)
app.include_router(schemas_api.router)
app.include_router(data_quality.router)
app.include_router(interoperability.router)
app.include_router(feedback.router)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting PediScreen backend...")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down PediScreen backend...")

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
