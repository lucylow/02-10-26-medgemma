import hmac
import hashlib
import json
from typing import Dict, Optional

# Mock webhook store
WEBHOOKS = {
    "demo-clinic": {
        "url": "https://hooks.example.com/pediscreen",
        "secret": "super-secret-key"
    }
}

def get_webhook(clinic_id: str) -> Optional[Dict]:
    return WEBHOOKS.get(clinic_id)

def register_webhook(clinic_id: str, url: str, secret: str) -> Dict:
    WEBHOOKS[clinic_id] = {"url": url, "secret": secret}
    return WEBHOOKS[clinic_id]

def sign_payload(secret: str, payload: Dict) -> str:
    message = json.dumps(payload, sort_keys=True).encode()
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()
