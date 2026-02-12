# backend/app/services/hl7_oru.py
"""
HL7 ORU^R01 message builder for AI triage results.
Radiology workflow: push AI priority and summary to EHR/PACS.
"""
from datetime import datetime


def build_oru_r01(
    study_id: str,
    patient_id: str,
    priority: str,
    summary: str,
) -> str:
    """
    Build standard ORU^R01 message for radiology triage.
    """
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")

    return f"""MSH|^~\\&|PEDISCREEN|RAD|EHR|RAD|{ts}||ORU^R01|{study_id}|P|2.5
PID|||{patient_id}||||
OBR|1|{study_id}|{study_id}|RADTRIAGE^Radiology Triage||{ts}
OBX|1|TX|AI_PRIORITY^AI Priority||{priority}
OBX|2|TX|AI_SUMMARY^AI Summary||{summary}
"""
