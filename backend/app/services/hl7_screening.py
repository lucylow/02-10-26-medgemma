"""
HL7 v2 ORU message builder for developmental screening results.
Adapts ORU^R01 for PediScreen AI screening reports (non-radiology).
"""
from datetime import datetime


def _escape_hl7(text: str) -> str:
    """Escape HL7 delimiters in text."""
    if not text:
        return ""
    return (
        str(text)
        .replace("\\", "\\E\\")
        .replace("|", "\\F\\")
        .replace("^", "\\S\\")
        .replace("~", "\\R\\")
        .replace("&", "\\T\\")
    )[:65535]
  # OBX-5 max length
)


def build_screening_oru(
    screening_id: str,
    patient_id: str,
    age_months: int,
    risk_level: str,
    summary: str,
    domain: str = "communication",
) -> str:
    """
    Build HL7 v2.5 ORU^R01 message for developmental screening.
    OBX segments carry risk level, summary, and domain.
    """
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    summary_esc = _escape_hl7(summary)[:500]

    return f"""MSH|^~\\&|PEDISCREEN|SCREEN|EHR|EHR|{ts}||ORU^R01|{screening_id}|P|2.5
PID|||{patient_id}||||
OBR|1|{screening_id}|{screening_id}|DEVScreen^Developmental Screening||{ts}
OBX|1|CE|RISK^Risk Level||{risk_level}^^^
OBX|2|TX|SUMMARY^Clinical Summary||{summary_esc}
OBX|3|CE|DOMAIN^Domain||{domain}^^^
OBX|4|NM|AGE^Age (months)||{age_months}|mo
"""
