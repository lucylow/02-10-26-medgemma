"""
Tamper-evident audit logging for PediScreen AI.
Structured audit entries with HMAC chaining for regulatory compliance.
"""

from .schema import AuditLogEntry, AuditEventType
from .logger import audit_logger
from .hmac_chain import compute_hmac, verify_chain

__all__ = [
    "AuditLogEntry",
    "AuditEventType",
    "audit_logger",
    "compute_hmac",
    "verify_chain",
]
