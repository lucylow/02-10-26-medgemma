# backend/app/renderers/report_renderer.py
"""Jinja2 renderers for TechnicalReport (HTML, PDF, Markdown)."""
from pathlib import Path
from typing import Dict, Any

from jinja2 import Environment, FileSystemLoader

# Resolve templates path relative to this file
_TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
env = Environment(loader=FileSystemLoader(str(_TEMPLATES_DIR)))


def _report_to_dict(report: Any) -> Dict[str, Any]:
    """Convert report (Pydantic model or dict) to dict with serializable values."""
    if hasattr(report, "dict"):
        d = report.dict()
    else:
        d = dict(report)
    # Serialize datetime for templates
    for k in ("created_at", "updated_at"):
        if k in d and d[k] and hasattr(d[k], "isoformat"):
            d[k] = d[k].isoformat()
    for c in d.get("citations", []):
        if isinstance(c, dict) and c.get("accessed_at") and hasattr(c["accessed_at"], "isoformat"):
            c["accessed_at"] = c["accessed_at"].isoformat()
    return d


def render_html(report: Any) -> str:
    """Render TechnicalReport to HTML."""
    tpl = env.get_template("technical_report.html.j2")
    return tpl.render(report=_report_to_dict(report))


def render_pdf(report: Any) -> bytes:
    """Render TechnicalReport to PDF bytes."""
    try:
        from weasyprint import HTML

        html = render_html(report)
        return HTML(string=html).write_pdf()
    except ImportError:
        from app.core.logger import logger

        logger.warning(
            "WeasyPrint not installed. Install with: pip install weasyprint"
        )
        return b"%PDF-1.4\n%placeholder\n"


def render_markdown(report: Any) -> str:
    """Render TechnicalReport to Markdown."""
    md_tpl = env.get_template("technical_report.md.j2")
    return md_tpl.render(report=_report_to_dict(report))


def generate_pdf_bytes(report: Any) -> bytes:
    """Alias for render_pdf for compatibility with end2end flow."""
    return render_pdf(report)
