# backend/app/services/pdf_renderer.py
"""
Jinja2 + WeasyPrint rendering for clinician and parent report PDFs.
"""
from jinja2 import Template
from typing import Dict
from datetime import datetime

from app.core.disclaimers import DISCLAIMER_DRAFT, PDF_FOOTER

# Simple Jinja2 template for clinician report (HTML)
HTML_TEMPLATE = """
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 28px; }
    h1 { color: #1a73e8; }
    .meta { color: #666; font-size: 12px; margin-bottom: 12px;}
    .section { margin-top: 18px; padding-bottom: 8px; border-bottom: 1px solid #eee; }
    ul { margin-top:8px; }
    .note { font-size: 13px; color:#444; }
  </style>
</head>
<body>
  <h1>PediScreen AI — Developmental Screening Report</h1>
  <div class="meta">
    Child: {{patient.patient_id}} • Age: {{patient.age}} • Screener: {{patient.screener}} • Date: {{date}}
  </div>
  <div class="section">
    <h3>Overall Screening Result</h3>
    <div class="note"><strong>{{risk_overall}}</strong></div>
  </div>

  <div class="section">
    <h3>Clinical Summary</h3>
    <div class="note">{{clinical_summary}}</div>
  </div>

  <div class="section">
    <h3>Supporting Evidence</h3>
    <ul>
      {% for ev in key_evidence %}
        <li>{{ev}}</li>
      {% endfor %}
    </ul>
  </div>

  <div class="section">
    <h3>Recommendations</h3>
    <ol>
      {% for rec in recommendations %}
        <li>{{rec}}</li>
      {% endfor %}
    </ol>
  </div>

  <div class="section">
    <h3>Disclaimer</h3>
    <div class="note">{{ disclaimer }}</div>
  </div>
  <div class="footer" style="font-size: 10px; color: #666; margin-top: 24px; padding-top: 12px; border-top: 1px solid #ddd;">
    {{ pdf_footer }}
  </div>
</body>
</html>
"""


def render_report_html(report: Dict) -> str:
    t = Template(HTML_TEMPLATE)
    generated_at = report.get("meta", {}).get("generated_at")
    date_str = (
        datetime.utcfromtimestamp(generated_at).strftime("%Y-%m-%d %H:%M UTC")
        if generated_at
        else datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    )
    return t.render(
        patient=report.get("patient_info", {}),
        date=date_str,
        risk_overall=report.get("risk_assessment", {}).get("overall", "Unknown"),
        clinical_summary=report.get("clinical_summary", ""),
        key_evidence=report.get("key_evidence", []),
        recommendations=report.get("recommendations", []),
        disclaimer=DISCLAIMER_DRAFT,
        pdf_footer=PDF_FOOTER,
    )


def generate_pdf_bytes(report: Dict) -> bytes:
    """Render report to PDF bytes using WeasyPrint.
    Uses TechnicalReport renderer when report has technical_summary + domains.
    """
    if report.get("technical_summary") is not None and report.get("domains") is not None:
        from app.renderers.report_renderer import render_pdf
        return render_pdf(report)
    try:
        from weasyprint import HTML

        html = render_report_html(report)
        pdf = HTML(string=html).write_pdf()
        return pdf
    except ImportError:
        # Fallback: return empty PDF or minimal HTML as placeholder when WeasyPrint not installed
        from app.core.logger import logger

        logger.warning(
            "WeasyPrint not installed. Install with: pip install weasyprint. "
            "Also requires system libs: libpango, libgdk-pixbuf, libcairo."
        )
        # Return minimal PDF-like placeholder
        return b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n178\n%%EOF"
