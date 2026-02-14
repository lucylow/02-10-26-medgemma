# MedSigLIP + Clinician Auth + Dashboard Implementation

This document describes the end-to-end implementation for:
1. MedSigLIP image embeddings + longitudinal storage
2. Clinician authentication (Google Identity / OAuth2)
3. Clinician dashboard (draft list → review → sign-off)

## 1. MedSigLIP Image Embeddings

### Backend services
- **`backend/app/services/medsiglip_local.py`** — Local transformers (privacy-first, no external calls)
- **`backend/app/services/medsiglip_vertex.py`** — Vertex AI MedSigLIP (HIPAA-friendly)
- **`backend/app/services/medsiglip_hf.py`** — Hugging Face fallback
- **`backend/app/services/embedding_utils.py`** — Canonical encode/decode (base64 float32, L2-normalized)
- **`backend/app/services/embedding_store.py`** — Persists embeddings (supports list or embedding_b64+shape)

### Standalone embed server
- **`server/embed_server.py`** — Production-grade FastAPI server with health, image_meta, request limits
- Run: `uvicorn server.embed_server:app --host 0.0.0.0 --port 5000`

### Configuration (`.env`)
```env
# Local-first (default: enabled; requires transformers+torch for local inference)
MEDSIGLIP_ENABLE_LOCAL=1

VERTEX_PROJECT=your-gcp-project
VERTEX_LOCATION=us-central1
VERTEX_MEDSIGLIP_ENDPOINT_ID=your-endpoint-id

HF_MEDSIGLIP_MODEL=google/medsiglip-base
HF_MEDSIGLIP_TOKEN=hf_xxx
```

### Flow (Local → Vertex → HF chain)
When generating a report with an image, the report generator:
1. Tries **local MedSigLIP** first (privacy-first, no external calls)
2. Falls back to **Vertex AI** if local unavailable
3. Falls back to **Hugging Face** if Vertex fails
4. Stores embedding in `image_embeddings` for longitudinal analysis
5. Attaches visual summary to `model_evidence`

### API endpoints
| Endpoint | Purpose |
|----------|---------|
| `POST /api/embed` | Compute embedding from image (backend) |
| `POST /embed` | Compute embedding (standalone embed server) |
| `POST /api/infer` | Privacy-first inference with precomputed embedding |

### Postgres (optional)
If using Postgres instead of MongoDB, run:
```sql
-- supabase/migrations/20250211020000_create_image_embeddings.sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE image_embeddings (...);
```

## 2. Clinician Auth (Google Identity)

### Backend
- **`backend/app/security/google_auth.py`** — `require_clinician` verifies Google ID tokens
- Protects: `GET /api/reports/drafts`, `POST /api/reports/{id}/approve`

### Configuration
```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
CLINICIAN_EMAIL_DOMAIN=@yourclinic.org
```

### Requirements
```bash
pip install google-auth>=2.0.0
```

## 3. Clinician Dashboard

### Frontend
- **`src/pages/ClinicianDashboard.tsx`** — List drafts, open review, sign off
- **Route:** `/clinician`
- **Google Sign-In:** Add `https://accounts.google.com/gsi/client` to `index.html` (done)

### Configuration
```env
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
VITE_MEDGEMMA_API_URL=http://localhost:8000/api
```

### Flow
1. Clinician visits `/clinician`
2. Signs in with Google (One Tap or Sign-in button)
3. Sees list of draft reports
4. Clicks "Review" → opens `ClinicianReview`
5. Edits summary/recommendations → signs off
6. Identity is captured in `clinician_id` and audit trail

## API Summary

| Endpoint                   | Auth              | Purpose                     |
|---------------------------|-------------------|-----------------------------|
| `GET /api/reports/drafts` | Bearer (clinician)| List draft reports          |
| `POST /api/reports/{id}/approve` | Bearer (clinician) | Sign off report         |
| `GET /api/reports/{id}`   | Bearer or x-api-key | Fetch report (clinician or programmatic) |
