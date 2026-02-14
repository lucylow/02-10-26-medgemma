"""
WADO-RS (DICOMweb) client for retrieving DICOM instances from hospital PACS.
Reference: DICOM PS3.18 (Web Services).
Auth via Bearer token (SMART / hospital gateway compatible).
"""
import httpx


async def fetch_dicom_instance(
    base_url: str,
    study_uid: str,
    series_uid: str,
    instance_uid: str,
    access_token: str,
) -> bytes:
    """
    Fetch a single DICOM instance via WADO-RS Retrieve Instance.
    Compatible with Epic, Sectra, GE, Philips PACS.
    """
    url = (
        f"{base_url.rstrip('/')}/studies/{study_uid}"
        f"/series/{series_uid}"
        f"/instances/{instance_uid}"
    )

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/dicom",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, headers=headers)
        r.raise_for_status()
        return r.content
