"""
Auth dependencies for FastAPI.
Supports: API key (dev), Bearer JWT (Supabase/OIDC).
RBAC enforced via require_permission.
"""

import os
import yaml
from pathlib import Path
from typing import Optional, List
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader

# Optional: integrate with backend/app/core/security if available
try:
    from app.core.security import get_api_key_or_supabase_user
    HAS_BACKEND_AUTH = True
except ImportError:
    HAS_BACKEND_AUTH = False

_http_bearer = HTTPBearer(auto_error=False)
_api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)

# Load RBAC from security/rbac.yml (relative to project root)
_RBAC_PATH = Path(__file__).resolve().parents[3] / "security" / "rbac.yml"
_ROLE_PERMISSIONS: dict = {}
if _RBAC_PATH.exists():
    with open(_RBAC_PATH) as f:
        _rbac = yaml.safe_load(f)
        for role, cfg in (_rbac.get("roles") or {}).items():
            _ROLE_PERMISSIONS[role] = set(cfg.get("permissions", []))


def _get_api_key() -> str:
    return os.getenv("API_KEY", "dev-example-key")


async def get_current_user(
    request: Request,
    cred: Optional[HTTPAuthorizationCredentials] = Depends(_http_bearer),
    x_api_key: Optional[str] = Depends(_api_key_header),
) -> dict:
    """
    Resolve current user from API key or Bearer JWT.
    Returns dict with: actor_id, actor_role, permissions, email (optional).
    """
    # API key (dev / service account)
    if x_api_key and x_api_key == _get_api_key():
        return {
            "actor_id": "api-key",
            "actor_role": "system_admin",
            "permissions": list(_ROLE_PERMISSIONS.get("system_admin", set())),
            "email": None,
        }

    # Bearer JWT (Supabase or OIDC)
    if cred and cred.credentials:
        try:
            import jwt
            # For Supabase: use HS256 + SUPABASE_JWT_SECRET
            secret = os.getenv("SUPABASE_JWT_SECRET")
            if secret:
                payload = jwt.decode(
                    cred.credentials,
                    secret,
                    audience="authenticated",
                    algorithms=["HS256"],
                )
            else:
                # Skip validation in dev if no secret
                payload = jwt.decode(
                    cred.credentials,
                    options={"verify_signature": False},
                    algorithms=["HS256", "RS256"],
                )
            sub = payload.get("sub", "unknown")
            email = payload.get("email")
            # Infer role from JWT claims (app_metadata.role or roles)
            roles = (
                payload.get("app_metadata", {}).get("roles")
                or payload.get("roles")
                or [payload.get("role", "chworker")]
            )
            role = roles[0] if isinstance(roles, list) and roles else (roles or "chworker")
            perms = _ROLE_PERMISSIONS.get(role, set())
            return {
                "actor_id": sub,
                "actor_role": role,
                "permissions": list(perms),
                "email": email,
            }
        except Exception:
            pass

    # No auth: allow in dev with default role (for backward compatibility)
    if os.getenv("AUTH_REQUIRED", "0") != "1":
        return {
            "actor_id": "anonymous",
            "actor_role": "chworker",
            "permissions": list(_ROLE_PERMISSIONS.get("chworker", set())),
            "email": None,
        }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing API Key or Bearer token",
    )


def require_permission(permission: str):
    """Dependency that requires the given permission."""

    async def _check(user: dict = Depends(get_current_user)):
        if permission not in user.get("permissions", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: missing permission '{permission}'",
            )
        return user

    return _check
