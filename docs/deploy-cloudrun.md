# Cloud Run Deployment (Cloud SQL + Secret Manager)

Deploy the PediScreen backend to Cloud Run with Cloud SQL (PostgreSQL) and Secret Manager.

## Prerequisites

- Google Cloud project with billing enabled
- `gcloud` CLI installed and authenticated
- Cloud SQL PostgreSQL instance (create via [Cloud Console](https://console.cloud.google.com/sql) or `gcloud sql instances create`)
- Artifact Registry or Container Registry (gcr.io) for images

## 1. Create Cloud SQL Instance

```bash
gcloud sql instances create pediscreen-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1
```

Create database and user:

```bash
gcloud sql databases create pediscreen --instance=pediscreen-db
gcloud sql users set-password postgres --instance=pediscreen-db --password=YOUR_PASSWORD
```

Run migrations (screenings + reports schema):

```bash
# From supabase/migrations or equivalent DDL
psql -h <INSTANCE_IP> -U postgres -d pediscreen -f supabase/migrations/20250211000000_create_screenings.sql
psql -h <INSTANCE_IP> -U postgres -d pediscreen -f supabase/migrations/20250211010000_create_reports.sql
```

Or use Cloud SQL Proxy for local connection:

```bash
cloud_sql_proxy -instances=PROJECT:REGION:pediscreen-db=tcp:5432
```

## 2. Create Secrets in Secret Manager

```bash
# DB password
echo -n "your-db-password" | gcloud secrets create DB_PASS --data-file=-

# Hugging Face API key (optional, for MedGemma)
echo -n "hf_xxx" | gcloud secrets create HF_API_KEY --data-file=-

# Grant Cloud Run service account access
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding DB_PASS \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding HF_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 3. Deploy via Script

```bash
export PROJECT_ID=your-project-id
export REGION=us-central1
export INSTANCE_CONNECTION_NAME=your-project:us-central1:pediscreen-db

# Full rollout (100% to new revision)
./scripts/deploy-cloudrun.sh

# Canary rollout (10% to new)
./scripts/deploy-cloudrun.sh --canary 10
```

## 4. Manual gcloud Deploy

```bash
# Build and push
docker build -t gcr.io/$PROJECT_ID/pediscreen-backend:latest -f backend/Dockerfile backend/
docker push gcr.io/$PROJECT_ID/pediscreen-backend:latest

# Deploy
gcloud run deploy pediscreen-backend \
  --image gcr.io/$PROJECT_ID/pediscreen-backend:latest \
  --region us-central1 \
  --platform managed \
  --set-cloudsql-instances $PROJECT_ID:us-central1:pediscreen-db \
  --set-secrets "DB_PASS=projects/$PROJECT_NUMBER/secrets/DB_PASS:latest,HF_API_KEY=projects/$PROJECT_NUMBER/secrets/HF_API_KEY:latest" \
  --update-env-vars "INSTANCE_CONNECTION_NAME=$PROJECT_ID:us-central1:pediscreen-db,DB_USER=postgres,DB_NAME=pediscreen,API_KEY=your-api-key" \
  --allow-unauthenticated
```

## 5. Traffic Management

```bash
# Route 100% to latest
gcloud run services update-traffic pediscreen-backend --to-latest --region=us-central1

# Split traffic (10% new, 90% old)
gcloud run services update-traffic pediscreen-backend \
  --to-revisions NEW_REVISION=10,OLD_REVISION=90 \
  --region=us-central1

# Rollback
gcloud run services update-traffic pediscreen-backend \
  --to-revisions OLD_REVISION=100 \
  --region=us-central1
```

## Environment Variables (Cloud Run)

| Variable | Source | Description |
|----------|--------|-------------|
| `INSTANCE_CONNECTION_NAME` | Env | `project:region:instance` — enables Cloud SQL |
| `DB_USER` | Env | PostgreSQL user |
| `DB_PASS` | Secret Manager | PostgreSQL password |
| `DB_NAME` | Env | Database name |
| `HF_API_KEY` | Secret Manager | Hugging Face API key (optional) |
| `API_KEY` | Env | API key for x-api-key header |

## Backend Behavior

- When `INSTANCE_CONNECTION_NAME` is set, the backend uses **Cloud SQL** for screenings (insert, list, get).
- When not set (local dev), it falls back to **MongoDB** via `MONGO_URI`.
- Reports remain in MongoDB until a full PostgreSQL migration is done.
