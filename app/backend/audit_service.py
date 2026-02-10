import time
import json
from typing import Dict, Any
from loguru import logger

# In a real system, this would write to a database or a secure log service
AUDIT_LOG_FILE = "audit_log.jsonl"

def append_audit(event: Dict[str, Any]):
    """
    Append an event to the audit log.
    Each event is a dictionary containing at least 'type' and 'ts'.
    """
    if "ts" not in event:
        event["ts"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    logger.info(f"AUDIT: {json.dumps(event)}")
    
    try:
        with open(AUDIT_LOG_FILE, "a") as f:
            f.write(json.dumps(event) + "\n")
    except Exception as e:
        logger.error(f"Failed to write to audit log: {e}")
