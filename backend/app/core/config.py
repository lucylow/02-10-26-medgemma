# backend/app/core/config.py
from pydantic import BaseSettings, Field
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "PediScreen AI - Backend"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # DB
    MONGO_URI: str = Field("mongodb://mongo:27017/pediscreen", env="MONGO_URI")
    DB_NAME: str = Field("pediscreen", env="DB_NAME")

    # Storage
    UPLOAD_DIR: str = Field("/tmp/pediscreen_uploads", env="UPLOAD_DIR")

    # Security
    API_KEY: str = Field("dev-example-key", env="API_KEY")
    ALLOWED_ORIGINS: Optional[str] = Field("*", env="ALLOWED_ORIGINS")  # comma-separated origins for CORS

    # Model config
    MEDGEMMA_MODE: bool = Field(False, env="MEDGEMMA_MODE")  # toggle to use real model
    MEDGEMMA_MODEL_NAME: Optional[str] = Field(None, env="MEDGEMMA_MODEL_NAME")

    # MedGemmaService: Vertex AI / Hugging Face
    HF_MODEL: Optional[str] = Field(None, env="HF_MODEL")
    HF_API_KEY: Optional[str] = Field(None, env="HF_API_KEY")
    VERTEX_PROJECT: Optional[str] = Field(None, env="VERTEX_PROJECT")
    VERTEX_LOCATION: Optional[str] = Field(None, env="VERTEX_LOCATION")
    VERTEX_TEXT_ENDPOINT_ID: Optional[str] = Field(None, env="VERTEX_TEXT_ENDPOINT_ID")
    VERTEX_VISION_ENDPOINT_ID: Optional[str] = Field(None, env="VERTEX_VISION_ENDPOINT_ID")
    REDIS_URL: Optional[str] = Field(None, env="REDIS_URL")
    ALLOW_PHI: bool = Field(False, env="ALLOW_PHI")  # default False for privacy

    # FHIR / EHR integration (SMART on FHIR)
    FHIR_BASE_URL: Optional[str] = Field(None, env="FHIR_BASE_URL")

    # HL7 ORU push (radiology triage → EHR/PACS)
    HL7_HOST: Optional[str] = Field(None, env="HL7_HOST")
    HL7_PORT: int = Field(2575, env="HL7_PORT")

    # MedSigLIP image embeddings (Vertex + HF fallback)
    VERTEX_MEDSIGLIP_ENDPOINT_ID: Optional[str] = Field(None, env="VERTEX_MEDSIGLIP_ENDPOINT_ID")
    HF_MEDSIGLIP_MODEL: Optional[str] = Field("google/medsiglip-base", env="HF_MEDSIGLIP_MODEL")
    HF_MEDSIGLIP_TOKEN: Optional[str] = Field(None, env="HF_MEDSIGLIP_TOKEN")

    # Clinician auth (Google Identity / OAuth2)
    GOOGLE_CLIENT_ID: Optional[str] = Field(None, env="GOOGLE_CLIENT_ID")
    CLINICIAN_EMAIL_DOMAIN: Optional[str] = Field("@yourclinic.org", env="CLINICIAN_EMAIL_DOMAIN")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
