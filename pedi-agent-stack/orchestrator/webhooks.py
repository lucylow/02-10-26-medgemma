import os, hmac, hashlib, json, time
import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
rcli = redis.from_url(REDIS_URL, decode_responses=True)

WEBHOOK_PREFIX = "webhook:"  # store mapping webhook:{clinic_id} -> json({url, secret})

def register_webhook(clinic_id: str, url: str, secret: str):
    key = WEBHOOK_PREFIX + clinic_id
    entry = {"url": url, "secret": secret, "created_at": time.time()}
    rcli.set(key, json.dumps(entry))
    return entry

def get_webhook(clinic_id: str):
    key = WEBHOOK_PREFIX + clinic_id
    raw = rcli.get(key)
    return json.loads(raw) if raw else None

def sign_payload(secret: str, payload: dict) -> str:
    """
    Returns signature header value: hex HMAC-SHA256 over payload bytes
    """
    body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), body, digestmod=hashlib.sha256).hexdigest()
    return sig

def verify_signature(secret: str, payload_bytes: bytes, signature_hex: str) -> bool:
    mac = hmac.new(secret.encode("utf-8"), payload_bytes, digestmod=hashlib.sha256).hexdigest()
    # Use hmac.compare_digest to avoid timing attacks
    return hmac.compare_digest(mac, signature_hex)
