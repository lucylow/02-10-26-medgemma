"""
Tokenized PHI store: persist encrypted PHI, return only UUID token to callers.

AI and telemetry receive only patient_token (UUID); PHI stays in isolated store.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from uuid import UUID

from app.services.phi_encryption import decrypt_phi, encrypt_phi

logger = logging.getLogger("phi_store")


async def store_phi(
    pool,
    external_patient_id: Optional[str],
    phi_data: Dict[str, Any],
    *,
    update_at: Optional[Any] = None,
) -> UUID:
    """
    Encrypt and store PHI; return the patient token (UUID).
    If external_patient_id already exists, updates encrypted_blob.
    """
    blob = encrypt_phi(phi_data)
    async with pool.acquire() as conn:
        if external_patient_id:
            row = await conn.fetchrow(
                """
                INSERT INTO patient_identity (external_patient_id, encrypted_blob, updated_at)
                VALUES ($1, $2, now())
                ON CONFLICT (external_patient_id)
                DO UPDATE SET encrypted_blob = $2, updated_at = now()
                RETURNING id
                """,
                external_patient_id,
                blob,
            )
        else:
            row = await conn.fetchrow(
                """
                INSERT INTO patient_identity (encrypted_blob)
                VALUES ($1)
                RETURNING id
                """,
                blob,
            )
        return row["id"]


async def resolve_phi(pool, patient_token: UUID) -> Optional[Dict[str, Any]]:
    """Decrypt and return PHI for the given token. Call only in PHI-allowed context."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT encrypted_blob FROM patient_identity WHERE id = $1",
            patient_token,
        )
    if not row:
        return None
    return decrypt_phi(bytes(row["encrypted_blob"]))


async def log_phi_access(
    pool,
    user_id: Optional[str],
    action: str,
    patient_token: UUID,
    resource_type: Optional[str] = None,
) -> None:
    """Append to phi_access_log for audit trail."""
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO phi_access_log (user_id, action, patient_token, resource_type)
            VALUES ($1, $2, $3, $4)
            """,
            user_id,
            action,
            patient_token,
            resource_type,
        )
