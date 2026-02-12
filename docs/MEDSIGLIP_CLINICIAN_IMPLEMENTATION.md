# MedSigLIP + Clinician Auth + Dashboard Implementation

This document describes the end-to-end implementation for:
1. MedSigLIP image embeddings + longitudinal storage
2. Clinician authentication (Google Identity / OAuth2)
3. Clinician dashboard (draft list → review → sign-off)

## 1. MedSigLIP Image Embeddings

### Backend services
- **`backend/app/services/medsiglip_vertex.py`** — Vertex AI MedSigLIP embedding (recommended, HIPAA-friendly)
- **`backend/app/services/medsiglip_hf.py`** — Hugging Face fallback when Vertex unavailable
- **`backend/app/services/embedding_store.py`** — Persists embeddings to MongoDB `image_embeddings` collection

### Configuration (`.env`)
```env
VERTEX_PROJECT=your-gcp-project
VERTEX_LOCATION=us-central1
VERTEX_MEDSIGLIP_ENDPOINT_ID=your-endpoint-id
# Or use VERTEX_VISION_ENDPOINT_ID if same endpoint

HF_MEDSIGLIP_MODEL=google/medsiglip-base
HF_MEDSIGLIP_TOKEN=hf_xxx
# Or HF_API_KEY as fallback
```

### Flow
When generating a report with an image, the report generator:
1. Tries Vertex MedSigLIP first
2. Falls back to HF Inference API if Vertex fails
3. Stores embedding in `image_embeddings` for longitudinal analysis
4. Attaches visual summary to `model_evidence`

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
