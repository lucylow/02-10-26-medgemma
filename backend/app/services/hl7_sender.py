# backend/app/services/hl7_sender.py
"""
HL7 MLLP sender: send ORU^R01 (and other messages) to EHR/PACS.
Non-blocking; suitable for fire-and-forget from review/auto-triage.
"""
import logging
import socket

logger = logging.getLogger("hl7.sender")


def send_hl7(message: str, host: str, port: int, timeout: float = 5.0) -> None:
    """
    Send HL7 message via MLLP (Message Length-Limited Protocol).
    Wraps message with \\x0b (VT) and \\x1c\\x0d (FS+CR).
    """
    payload = f"\x0b{message}\x1c\x0d"
    try:
        with socket.create_connection((host, port), timeout=timeout) as sock:
            sock.sendall(payload.encode("utf-8"))
        logger.info("HL7 sent to %s:%d", host, port)
    except Exception as e:
        logger.warning("HL7 send failed to %s:%d: %s", host, port, e)
        raise
