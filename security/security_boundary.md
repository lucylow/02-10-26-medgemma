# Security Boundary & Architecture

## Overview

This document defines the security boundaries for PediScreen AI, mapping data flow from frontend through backend services to model inference and storage.

## Architecture Diagram

```mermaid
flowchart TB
    subgraph Frontend["Frontend (React/React Native)"]
        UI[Web/Mobile UI]
        AuthClient[Auth Client - OIDC PKCE]
    end

    subgraph Gateway["API Gateway / Ingress"]
        TLS[TLS Termination]
        RateLimit[Rate Limiter]
        WAF[WAF - Optional]
    end

    subgraph Backend["Backend Services"]
        API[FastAPI App]
        RBAC[RBAC Middleware]
        Audit[Audit Logger]
        Auth[Auth Deps - JWT/OIDC]
    end

    subgraph ModelService["Model Service Layer"]
        MedGemma[MedGemma Inference]
        MedSigLIP[MedSigLIP Vision]
        Gemma3[Gemma3 Communication]
    end

    subgraph Storage["Storage Layer"]
        DB[(PostgreSQL/MongoDB)]
        AuditStore[(Append-Only Audit Store)]
        ObjectStore[(Encrypted Object Storage)]
    end

    subgraph External["External Systems"]
        OIDC[OIDC Provider - Okta/GCP]
        Vault[Secrets Vault]
        KMS[KMS - Key Management]
    end

    UI --> AuthClient
    AuthClient -->|PKCE Login| OIDC
    OIDC -->|JWT| AuthClient
    AuthClient -->|Bearer Token| TLS

    TLS --> RateLimit --> WAF --> API
    API --> Auth
    Auth --> RBAC
    RBAC --> Audit
    Audit --> MedGemma
    Audit --> MedSigLIP
    Audit --> Gemma3

    MedGemma --> DB
    MedGemma --> AuditStore
    API --> ObjectStore

    API --> Vault
    AuditStore --> KMS
```

## Security Boundaries

| Boundary | Description | Controls |
|----------|-------------|----------|
| **Frontend → Gateway** | User requests enter via TLS. | TLS 1.3, HSTS, CSP headers |
| **Gateway → Backend** | Requests authenticated before processing. | JWT validation, rate limiting |
| **Backend → Auth** | Every sensitive request validated. | OIDC/JWT, MFA for clinician/admin |
| **Backend → RBAC** | Authorization enforced per endpoint. | Role→Permission mapping, least privilege |
| **Backend → Model** | Inference requests logged before execution. | Audit log, HMAC chain |
| **Backend → Storage** | PHI encrypted at rest. | KMS, access controls |
| **Audit Store** | Append-only, tamper-evident. | HMAC chaining, WORM retention |

## Data Flow for Inference

1. **Request**: Frontend sends `POST /api/analyze` with JWT + request body (observations, age, optional embeddings).
2. **Auth**: Middleware validates JWT, extracts `sub`, `roles`, `email`.
3. **RBAC**: Checks `infer_case` permission for user's role.
4. **Audit (pre)**: Computes `input_hash`, `prompt_hash`; creates audit entry stub.
5. **Inference**: MedGemma/MedSigLIP process; no raw PHI logged.
6. **Audit (post)**: Completes audit entry with `response`, `hmac`, appends to chain.
7. **Response**: Returns structured report; screening_id and inference_id for traceability.

## Trust Boundaries

- **Untrusted**: Client IP, user input (observations, images).
- **Semi-trusted**: OIDC provider (identity), frontend (token handling).
- **Trusted**: Backend services, model servers, audit store, KMS.

## See Also

- [sensitive_operations.csv](./sensitive_operations.csv) — Full inventory of sensitive operations
- [rbac.yml](./rbac.yml) — Role-permission mapping
- [log_storage.md](./log_storage.md) — Audit log storage and retention
