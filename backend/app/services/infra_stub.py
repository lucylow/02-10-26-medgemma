# backend/app/services/infra_stub.py
import time
import threading
from typing import Dict, Any, List
from datetime import datetime, timezone
import random
from .audit import write_audit

# In-memory data store (demo only)
_DEPLOYMENTS: Dict[str, Dict[str, Any]] = {}
_NODES: List[Dict[str, Any]] = []
_CONFIGMAPS: Dict[str, Dict[str, str]] = {}
_SECRETS: Dict[str, Dict[str, str]] = {}
_AUDIT_FILE = "infra_audit.log"
_lock = threading.Lock()


def _now_iso():
    return datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()


# Seed with sample data
def seed():
    with _lock:
        _DEPLOYMENTS.clear()
        _NODES.clear()
        _CONFIGMAPS.clear()
        _SECRETS.clear()

        _DEPLOYMENTS["default:medgemma-backend"] = {
            "name": "medgemma-backend",
            "namespace": "default",
            "replicas": 2,
            "readyReplicas": 2,
            "updatedReplicas": 2,
            "image": "gcr.io/demo/medgemma-backend:dev",
            "lastUpdate": _now_iso(),
            "status": "Healthy",
            "gpuRequested": False,
            "pods": ["medgemma-backend-abc123", "medgemma-backend-def456"]
        }

        _DEPLOYMENTS["default:medgemma-worker"] = {
            "name": "medgemma-worker",
            "namespace": "default",
            "replicas": 1,
            "readyReplicas": 1,
            "updatedReplicas": 1,
            "image": "gcr.io/demo/medgemma-worker:dev",
            "lastUpdate": _now_iso(),
            "status": "Updating",
            "gpuRequested": True,
            "pods": ["medgemma-worker-ghi789"]
        }

        _NODES.extend([
            {
                "name": "gke-node-1",
                "labels": {"accelerator": "nvidia-tesla-t4", "pool": "gpu-pool"},
                "gpuAllocated": 1,
                "gpuCapacity": 1,
                "cpuAlloc": "4/8",
                "memAlloc": "8Gi/16Gi",
                "ready": True
            },
            {
                "name": "gke-node-2",
                "labels": {"pool": "default-pool"},
                "gpuAllocated": 0,
                "gpuCapacity": 0,
                "cpuAlloc": "2/4",
                "memAlloc": "4Gi/8Gi",
                "ready": True
            }
        ])

        _CONFIGMAPS["default:medgemma-config"] = {
            "LOG_LEVEL": "info",
            "RETENTION_DAYS": "365"
        }

        _SECRETS["default:hf_api_key"] = {
            "value": "super-secret-key-demo",
            "createdAt": _now_iso()
        }

        write_audit("seed", "system", "seed", "seeded initial stub data")


# get all deployments
def list_deployments():
    with _lock:
        return list(_DEPLOYMENTS.values())


def get_deployment(namespace: str, name: str):
    key = f"{namespace}:{name}"
    with _lock:
        return _DEPLOYMENTS.get(key)


def scale_deployment(namespace: str, name: str, replicas: int, actor: str):
    key = f"{namespace}:{name}"
    with _lock:
        d = _DEPLOYMENTS.get(key)
        if not d:
            raise KeyError("deployment not found")
        old = d["replicas"]
        d["replicas"] = replicas
        d["lastUpdate"] = _now_iso()
        d["status"] = "Updating"
        # simulate readyReplicas catch-up
        def finish_scale():
            time.sleep(1.5)
            with _lock:
                d["readyReplicas"] = replicas
                d["updatedReplicas"] = replicas
                d["status"] = "Healthy"
                d["lastUpdate"] = _now_iso()
        threading.Thread(target=finish_scale, daemon=True).start()
        write_audit("scale", actor, f"{namespace}/{name}", {"from": old, "to": replicas})
        return d


def redeploy(namespace: str, name: str, actor: str):
    key = f"{namespace}:{name}"
    with _lock:
        d = _DEPLOYMENTS.get(key)
        if not d:
            raise KeyError("deployment not found")
        d["status"] = "Updating"
        d["lastUpdate"] = _now_iso()
        # simulate restart
        def finish_redeploy():
            time.sleep(2.0)
            with _lock:
                d["status"] = "Healthy"
                d["lastUpdate"] = _now_iso()
                # bump image tag for demo
                d["image"] = d["image"].split(":")[0] + ":" + "redeploy-" + str(int(time.time()))
        threading.Thread(target=finish_redeploy, daemon=True).start()
        write_audit("redeploy", actor, f"{namespace}/{name}", {"action": "redeploy"})
        return d


def list_nodes():
    with _lock:
        return list(_NODES)


def health_checks():
    # simple health checks
    return [
        {"name": "database", "ok": True},
        {"name": "redis", "ok": True},
        {"name": "model-endpoint", "ok": random.choice([True, True, True, False]), "details": "Intermittent" if random.random() < 0.2 else None}
    ]


def get_configmap(namespace: str, name: str):
    key = f"{namespace}:{name}"
    with _lock:
        data = _CONFIGMAPS.get(key)
        if data is None:
            raise KeyError("configmap not found")
        return data


def patch_configmap(namespace: str, name: str, data: Dict[str, str], actor: str):
    key = f"{namespace}:{name}"
    with _lock:
        if key not in _CONFIGMAPS:
            _CONFIGMAPS[key] = {}
        _CONFIGMAPS[key].update(data)
        write_audit("config_patch", actor, key, data)
        return _CONFIGMAPS[key]


def list_secrets(namespace: str):
    prefix = f"{namespace}:"
    items = []
    with _lock:
        for k, v in _SECRETS.items():
            if k.startswith(prefix):
                name = k.split(":", 1)[1]
                masked = _mask_secret(v["value"])
                items.append({"name": name, "masked": masked, "createdAt": v["createdAt"]})
    return items


def rotate_secret(namespace: str, name: str, actor: str):
    key = f"{namespace}:{name}"
    with _lock:
        if key not in _SECRETS:
            raise KeyError("secret not found")
        newval = f"rotated-{int(time.time())}-{random.randint(1000, 9999)}"
        _SECRETS[key]["value"] = newval
        _SECRETS[key]["createdAt"] = _now_iso()
        write_audit("rotate_secret", actor, key, {"rotated": True})
        return {"ok": True}


def _mask_secret(s: str):
    if not s:
        return ""
    if len(s) <= 6:
        return "*" * len(s)
    return "*" * 6 + s[-6:]


# expose simple log generator for websocket
def log_stream_generator(namespace: str, pod: str, stop_event):
    # yield lines until stop_event is set
    i = 0
    levels = ["INFO", "WARN", "ERROR", "DEBUG"]
    while not stop_event.is_set():
        i += 1
        ts = datetime.utcnow().isoformat()
        level = random.choices(levels, weights=[80, 10, 5, 5])[0]
        msg = f"{ts} {level} {pod} - demo log line {i} - event={random.randint(100, 999)}"
        yield msg
        time.sleep(0.5)
