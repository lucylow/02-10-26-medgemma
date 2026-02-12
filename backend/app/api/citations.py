# backend/app/api/citations.py
"""Citation resolution — DOI/URL to metadata (manual or CrossRef)."""
import re
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Query

from app.core.security import get_api_key

router = APIRouter(prefix="/api/citations", tags=["Citations"])

# Optional: CrossRef API for DOI resolution (no key required for public)
CROSSREF_URL = "https://api.crossref.org/works"


@router.get("/resolve")
async def resolve_citation(
    doi: Optional[str] = Query(None),
    url: Optional[str] = Query(None),
    api_key: str = Depends(get_api_key),
):
    """
    Resolve DOI or URL to brief metadata (title, authors).
    For DOI: uses CrossRef. For URL: returns placeholder for manual entry.
    """
    if doi:
        return await _resolve_doi(doi)
    if url:
        return await _resolve_url(url)
    return {"error": "Provide doi= or url="}


async def _resolve_doi(doi: str) -> dict:
    """Fetch metadata from CrossRef for a DOI."""
    doi = doi.strip()
    if not re.match(r"10\.\d{4,}/[\S]+", doi):
        return {"error": "Invalid DOI format"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{CROSSREF_URL}/{doi}")
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        return {"error": str(e), "doi": doi}

    msg = data.get("message", {})
    title = " ".join(msg.get("title", []))
    authors = msg.get("author", [])
    author_str = ", ".join(
        a.get("given", "") + " " + a.get("family", "") for a in authors[:5]
    )
    return {
        "doi": doi,
        "title": title,
        "authors": author_str,
        "url": msg.get("URL", f"https://doi.org/{doi}"),
    }


async def _resolve_url(url: str) -> dict:
    """Placeholder for URL — manual entry or future scraper."""
    return {
        "url": url.strip(),
        "title": "",
        "authors": "",
        "note": "Manual entry — add title and authors",
    }
