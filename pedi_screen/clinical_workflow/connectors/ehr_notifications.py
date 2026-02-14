"""
EHR notifications — clinical task notifications.
Stub implementation.
"""
from typing import Any, Dict, List, Optional


def send_clinical_task_notification(
    clinician_id: str,
    task_type: str,
    case_id: str,
    message: str,
    **kwargs,
) -> bool:
    """
    Send clinical task notification (e.g. screening ready for review).
    Stub: integrate with EHR notification system.
    """
    return True
