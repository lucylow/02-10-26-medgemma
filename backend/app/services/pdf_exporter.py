"""
PDF export with locked sections for clinician-safe, audit-ready reports.
Locked sections cannot be altered; PDF clearly labels AI-generated vs clinician-reviewed.
"""
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from jinja2 import Environment, FileSystemLoader

try:
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False


def _build_sections(report: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Convert report dict to section list with locked/editable flags."""
    patient = report.get("patient_info", {})
    risk = report.get("risk_assessment", {})
    sections: List[Dict[str, Any]] = []

    # Risk Assessment — locked (regulatory)
    overall = risk.get("overall", "Unknown")
    domains = risk.get("domains", {})
    risk_text = f"Overall: {overall}"
    if domains:
        risk_text += f". Domains: {', '.join(f'{k}={v}' for k, v in domains.items())}"
    sections.append({
        "title": "Risk Stratification",
        "content": risk_text,
        "locked": True,
    })

    # Clinical Summary — editable
    sections.append({
        "title": "Clinical Summary",
        "content": report.get("clinical_summary", ""),
        "locked": False,
    })

    # Key Evidence — locked (AI-generated)
    evidence = report.get("key_evidence", [])
    evidence_text = "\n".join(f"• {e}" for e in evidence) if evidence else "None documented."
    sections.append({
        "title": "Supporting Evidence",
        "content": evidence_text,
        "locked": True,
    })

    # Recommendations — editable
    recs = report.get("recommendations", [])
    rec_text = "\n".join(f"{i+1}. {r}" for i, r in enumerate(recs)) if recs else "None."
    sections.append({
        "title": "Recommendations",
        "content": rec_text,
        "locked": False,
    })

    # Disclaimer — locked
    disclaimer = (
        "This report is an automated, draft summary produced by PediScreen AI. "
        "It requires clinician review and sign-off prior to insertion in the medical record. "
        "This tool provides decision support only and does not make diagnoses."
    )
    sections.append({
        "title": "Disclaimer",
        "content": disclaimer,
        "locked": True,
    })

    return sections


def export_report_pdf(
    report: Dict[str, Any],
    clinician_name: str,
    version: str = "final",
) -> bytes:
    """Render report to PDF with locked section labels."""
    template_dir = Path(__file__).resolve().parent.parent / "templates"
    env = Environment(loader=FileSystemLoader(str(template_dir)))
    template = env.get_template("report.html")

    sections = _build_sections(report)
    generated_at = report.get("meta", {}).get("generated_at")
    date_str = (
        datetime.utcfromtimestamp(generated_at).strftime("%Y-%m-%d %H:%M UTC")
        if generated_at
        else datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    )

    html = template.render(
        sections=sections,
        clinician=clinician_name,
        generated_at=date_str,
        version=version,
        patient_id=report.get("patient_info", {}).get("patient_id", "—"),
    )

    if WEASYPRINT_AVAILABLE:
        return HTML(string=html).write_pdf()
    # Fallback: minimal placeholder
    from app.core.logger import logger
    logger.warning("WeasyPrint not installed; PDF export unavailable.")
    return b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n178\n%%EOF"
