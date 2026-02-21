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
    MOCK_MODE: bool = Field(True, env="MOCK_MODE")  # demo mode: use mock when no model configured
    MOCK_FALLBACK: bool = Field(True, env="MOCK_FALLBACK")  # return deterministic mock when model unavailable
    MEDGEMMA_MODEL_NAME: Optional[str] = Field(None, env="MEDGEMMA_MODEL_NAME")

    # MedGemmaService: Vertex AI / Hugging Face
    HF_MODEL: Optional[str] = Field(None, env="HF_MODEL")
    HF_API_KEY: Optional[str] = Field(None, env="HF_API_KEY")
    VERTEX_PROJECT: Optional[str] = Field(None, env="VERTEX_PROJECT")
    VERTEX_LOCATION: Optional[str] = Field(None, env="VERTEX_LOCATION")
    VERTEX_TEXT_ENDPOINT_ID: Optional[str] = Field(None, env="VERTEX_TEXT_ENDPOINT_ID")
    VERTEX_VISION_ENDPOINT_ID: Optional[str] = Field(None, env="VERTEX_VISION_ENDPOINT_ID")
    VERTEX_RADIOLOGY_ENDPOINT_ID: Optional[str] = Field(None, env="VERTEX_RADIOLOGY_ENDPOINT_ID")
    REDIS_URL: Optional[str] = Field(None, env="REDIS_URL")
    ALLOW_PHI: bool = Field(False, env="ALLOW_PHI")  # default False for privacy

    # FHIR / EHR integration (SMART on FHIR)
    FHIR_BASE_URL: Optional[str] = Field(None, env="FHIR_BASE_URL")
    SMART_CLIENT_ID: Optional[str] = Field(None, env="SMART_CLIENT_ID")
    SMART_CLIENT_SECRET: Optional[str] = Field(None, env="SMART_CLIENT_SECRET")
    SMART_REDIRECT_URI: Optional[str] = Field(None, env="SMART_REDIRECT_URI")
    # Epic production: optional overrides (defaults use FHIR_BASE_URL + .well-known/smart-configuration)
    EPIC_FHIR_SERVER_URL: Optional[str] = Field(None, env="EPIC_FHIR_SERVER_URL")
    EPIC_TOKEN_URL: Optional[str] = Field(None, env="EPIC_TOKEN_URL")

    # HL7 ORU push (radiology triage → EHR/PACS)
    HL7_HOST: Optional[str] = Field(None, env="HL7_HOST")
    HL7_PORT: int = Field(2575, env="HL7_PORT")

    # LoRA adapter provenance (GCS path or local dir for traceability)
    LORA_ADAPTER_PATH: Optional[str] = Field(None, env="LORA_ADAPTER_PATH")
    BASE_MODEL_ID: str = Field("google/medgemma-2b-it", env="BASE_MODEL_ID")

    # MedSigLIP image embeddings (Local -> Vertex -> HF fallback chain)
    MEDSIGLIP_ENABLE_LOCAL: bool = Field(True, env="MEDSIGLIP_ENABLE_LOCAL")  # Local transformers when available
    VERTEX_MEDSIGLIP_ENDPOINT_ID: Optional[str] = Field(None, env="VERTEX_MEDSIGLIP_ENDPOINT_ID")
    HF_MEDSIGLIP_MODEL: Optional[str] = Field("google/medsiglip-base", env="HF_MEDSIGLIP_MODEL")
    HF_MEDSIGLIP_TOKEN: Optional[str] = Field(None, env="HF_MEDSIGLIP_TOKEN")

    # Supabase JWT (for Bearer token validation when frontend uses Supabase Auth)
    SUPABASE_URL: Optional[str] = Field(None, env="SUPABASE_URL")
    SUPABASE_JWT_SECRET: Optional[str] = Field(None, env="SUPABASE_JWT_SECRET")

    # Clinician auth (Google Identity / OAuth2)
    GOOGLE_CLIENT_ID: Optional[str] = Field(None, env="GOOGLE_CLIENT_ID")
    CLINICIAN_EMAIL_DOMAIN: Optional[str] = Field("@yourclinic.org", env="CLINICIAN_EMAIL_DOMAIN")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
