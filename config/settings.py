from pydantic import BaseSettings
from typing import Optional, List

class Settings(BaseSettings):
    MEDGEMMA_MODEL_PATH: str = "google/medgemma-2b-it"
    MEDSIGLIP_MODEL_PATH: str = "google/medsiglip-base"
    AI_MODEL_DEVICE: str = "cuda:0"   # or "cpu"
    AI_MAX_TOKENS: int = 512
    AI_TEMPERATURE: float = 0.1

    # storage + limits
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024

    class Config:
        env_file = ".env"

settings = Settings()
