# backend/app/services/storage.py
import os
import shutil
import uuid
from pathlib import Path
from app.core.config import settings

UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def save_upload(file, filename: str = None) -> str:
    """
    Saves a Starlette UploadFile-like object to disk and returns path.
    Callers should remove the file after analysis if needed.
    """
    if filename is None:
        filename = f"{uuid.uuid4().hex}.bin"
    dest = UPLOAD_DIR / filename
    with dest.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return str(dest)

def remove_file(path: str):
    try:
        os.remove(path)
    except Exception:
        pass
