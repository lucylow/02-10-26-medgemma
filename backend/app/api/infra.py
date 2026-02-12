# backend/app/api/infra.py
import asyncio
import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from app.services.infra_stub import (
    seed, list_deployments, scale_deployment, redeploy,
    list_nodes, health_checks, get_configmap, patch_configmap,
    list_secrets, rotate_secret,
)
from app.core.security import admin_required, _ADMIN_TOKEN
from app.services.audit import write_audit

router = APIRouter()

# Seed initial demo data on import
seed()


@router.get("/api/infra/deployments")
async def api_list_deployments(auth=Depends(admin_required)):
    items = list_deployments()
    return {"items": items}


@router.post("/api/infra/deployments/{namespace}/{name}/scale")
async def api_scale_deployment(namespace: str, name: str, body: dict, auth=Depends(admin_required)):
    replicas = body.get("replicas")
    if replicas is None:
        raise HTTPException(status_code=400, detail="replicas required")
    d = scale_deployment(namespace, name, int(replicas), actor=auth["actor"])
    return {"ok": True, "deployment": d}


@router.post("/api/infra/deployments/{namespace}/{name}/redeploy")
async def api_redeploy(namespace: str, name: str, auth=Depends(admin_required)):
    d = redeploy(namespace, name, actor=auth["actor"])
    return {"ok": True, "deployment": d}


@router.get("/api/infra/nodes")
async def api_nodes(auth=Depends(admin_required)):
    nodes = list_nodes()
    return {"nodes": nodes}


@router.get("/api/infra/health")
async def api_health(auth=Depends(admin_required)):
    checks = health_checks()
    return {"checks": checks}


@router.get("/api/infra/config/{namespace}/{name}")
async def api_get_config(namespace: str, name: str, auth=Depends(admin_required)):
    try:
        data = get_configmap(namespace, name)
    except KeyError:
        raise HTTPException(status_code=404, detail="configmap not found")
    return {"data": data}


@router.patch("/api/infra/config/{namespace}/{name}")
async def api_patch_config(namespace: str, name: str, body: dict, auth=Depends(admin_required)):
    new = patch_configmap(namespace, name, body, actor=auth["actor"])
    return {"ok": True, "data": new}


@router.get("/api/infra/secrets/{namespace}")
async def api_list_secrets(namespace: str, auth=Depends(admin_required)):
    items = list_secrets(namespace)
    return {"items": items}


@router.post("/api/infra/secrets/{namespace}/{name}/rotate")
async def api_rotate_secret(namespace: str, name: str, auth=Depends(admin_required)):
    r = rotate_secret(namespace, name, actor=auth["actor"])
    return {"ok": True, "result": r}


# --- WebSocket logs stream
@router.websocket("/ws/logs")
async def websocket_logs(ws: WebSocket, ns: str = Query(...), pod: str = Query(...), container: str = Query(None), token: str = Query(None)):
    if token != _ADMIN_TOKEN:
        await ws.close(code=1008)
        return
    await ws.accept()
    stop_event = asyncio.Event()
    write_audit("ws_connect", "admin_ws", f"{ns}/{pod}", {"container": container})
    try:
        i = 0
        while True:
            # WebSocket.CONNECTING=0, CONNECTED=1, DISCONNECTING=2, DISCONNECTED=3
            if ws.client_state != 1:
                break
            i += 1
            ts = datetime.utcnow().isoformat()
            level = random.choices(["INFO", "WARN", "ERROR", "DEBUG"], weights=[80, 10, 5, 5])[0]
            msg = f"{ts} {level} {pod} - demo log line {i} - event={random.randint(100, 999)}"
            await ws.send_text(msg)
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        write_audit("ws_disconnect", "admin_ws", f"{ns}/{pod}", {"reason": "client disconnected"})
    except Exception as e:
        write_audit("ws_error", "admin_ws", f"{ns}/{pod}", {"error": str(e)})
    finally:
        stop_event.set()
        try:
            await ws.close()
        except Exception:
            pass
