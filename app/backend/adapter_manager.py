"""
AdapterManager: utility to fetch adapters from GCS, HuggingFace, or local path.
"""

import os
import shutil
from pathlib import Path
from loguru import logger

try:
    from google.cloud import storage
    GCS_AVAILABLE = True
except ImportError:
    GCS_AVAILABLE = False
    logger.warning("google-cloud-storage not installed. GCS adapter fetching disabled.")


def download_from_gcs(gcs_uri: str, local_dir: str, project: str = None) -> str:
    """
    Download adapter from Google Cloud Storage.
    
    Args:
        gcs_uri: GCS URI (gs://bucket/path/to/adapter/)
        local_dir: Local directory to download to
        project: GCP project (optional)
        
    Returns:
        Local directory path
    """
    if not GCS_AVAILABLE:
        raise RuntimeError("google-cloud-storage package not installed")
    
    if not gcs_uri.startswith("gs://"):
        raise ValueError("gcs_uri must start with gs://")
    
    _, rest = gcs_uri.split("gs://", 1)
    parts = rest.split("/", 1)
    bucket_name = parts[0]
    prefix = parts[1] if len(parts) > 1 else ""
    
    client = storage.Client(project=project)
    bucket = client.bucket(bucket_name)
    blobs = list(bucket.list_blobs(prefix=prefix))
    
    if not blobs:
        raise RuntimeError(f"No blobs found at {gcs_uri}")
    
    os.makedirs(local_dir, exist_ok=True)
    
    for blob in blobs:
        rel = blob.name[len(prefix):].lstrip("/")
        if not rel:
            continue
        out_path = os.path.join(local_dir, rel)
        out_dir = os.path.dirname(out_path)
        os.makedirs(out_dir, exist_ok=True)
        logger.info("Downloading %s -> %s", blob.name, out_path)
        blob.download_to_filename(out_path)
    
    return local_dir


def download_from_huggingface(repo_id: str, local_dir: str) -> str:
    """
    Download adapter from HuggingFace Hub.
    
    Args:
        repo_id: HuggingFace repo ID (e.g., "user/pediscreen-adapter")
        local_dir: Local directory to download to
        
    Returns:
        Local directory path
    """
    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        raise RuntimeError("huggingface_hub package not installed")
    
    logger.info("Downloading adapter from HuggingFace: %s", repo_id)
    
    path = snapshot_download(
        repo_id=repo_id,
        local_dir=local_dir,
        local_dir_use_symlinks=False
    )
    
    return path


def ensure_adapter(adapter_source: str, local_target: str) -> str:
    """
    Ensure adapter is available locally.
    
    Adapter source can be:
    - Local path (copy to target)
    - GCS URI (gs://...) 
    - HuggingFace repo ID
    
    Args:
        adapter_source: Source path/URI/repo
        local_target: Local target directory
        
    Returns:
        Local path to adapter
    """
    # Clear existing target
    if os.path.exists(local_target):
        shutil.rmtree(local_target)
    os.makedirs(local_target, exist_ok=True)
    
    if adapter_source.startswith("gs://"):
        return download_from_gcs(adapter_source, local_target)
    
    elif adapter_source.startswith("hf://") or "/" in adapter_source and not os.path.exists(adapter_source):
        # Assume HuggingFace repo format
        repo_id = adapter_source.replace("hf://", "")
        return download_from_huggingface(repo_id, local_target)
    
    elif os.path.exists(adapter_source):
        # Local path - copy to target
        shutil.copytree(adapter_source, local_target, dirs_exist_ok=True)
        return local_target
    
    else:
        raise ValueError(f"Adapter source not found or unsupported: {adapter_source}")


def list_adapter_files(adapter_dir: str) -> list:
    """List files in adapter directory"""
    if not os.path.exists(adapter_dir):
        return []
    return list(Path(adapter_dir).rglob("*"))
