#!/usr/bin/env bash
# PediScreen Backend - Cloud Run deployment with Cloud SQL + Secret Manager
# Prerequisites: gcloud CLI, Docker, Cloud SQL instance, Artifact Registry repo
#
# Usage:
#   export PROJECT_ID=my-project
#   export REGION=us-central1
#   export INSTANCE_CONNECTION_NAME=my-project:us-central1:my-instance
#   ./scripts/deploy-cloudrun.sh [--canary 10]
#
# Options:
#   --canary N   Route N% traffic to new revision (default: 100%)

set -e

# Config (override via env)
PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-pediscreen-backend}"
IMAGE_NAME="${IMAGE_NAME:-pediscreen-backend}"
INSTANCE_CONNECTION_NAME="${INSTANCE_CONNECTION_NAME:?Set INSTANCE_CONNECTION_NAME}"
TAG="${TAG:-$(date +%Y%m%d-%H%M%S)}"
CANARY_PCT=100

for arg in "$@"; do
  case $arg in
    --canary=*)
      CANARY_PCT="${arg#*=}"
      ;;
    --canary)
      shift
      CANARY_PCT="${1:-10}"
      ;;
  esac
done

# Resolve project number (needed for secret paths)
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
echo "Project: $PROJECT_ID ($PROJECT_NUMBER) | Region: $REGION | Instance: $INSTANCE_CONNECTION_NAME"

# 1. Create secrets if they don't exist (one-time)
create_secret_if_missing() {
  local name=$1
  if ! gcloud secrets describe "$name" --project="$PROJECT_ID" &>/dev/null; then
    echo "Creating secret $name (enter value when prompted)..."
    echo -n "Value for $name: "
    read -s val
    echo
    echo -n "$val" | gcloud secrets create "$name" --data-file=- --project="$PROJECT_ID"
    echo "Granting secretAccessor to default compute SA..."
    gcloud secrets add-iam-policy-binding "$name" \
      --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
      --role="roles/secretmanager.secretAccessor" \
      --project="$PROJECT_ID"
  else
    echo "Secret $name exists."
  fi
}

create_secret_if_missing "DB_PASS"
create_secret_if_missing "HF_API_KEY" 2>/dev/null || true

# 2. Build and push image
REPO="gcr.io/${PROJECT_ID}/${IMAGE_NAME}"
echo "Building $REPO:$TAG..."
cd "$(dirname "$0")/.."
docker build -t "$REPO:$TAG" -f backend/Dockerfile backend/
docker push "$REPO:$TAG"

# 3. Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$REPO:$TAG" \
  --region "$REGION" \
  --platform managed \
  --set-cloudsql-instances "$INSTANCE_CONNECTION_NAME" \
  --set-secrets "DB_PASS=projects/${PROJECT_NUMBER}/secrets/DB_PASS:latest,HF_API_KEY=projects/${PROJECT_NUMBER}/secrets/HF_API_KEY:latest" \
  --update-env-vars "INSTANCE_CONNECTION_NAME=${INSTANCE_CONNECTION_NAME},DB_USER=postgres,DB_NAME=pediscreen,CLOUDSQL_ENABLE_IAM_AUTH=false" \
  --allow-unauthenticated \
  --project "$PROJECT_ID"

# 4. Traffic routing
if [ "$CANARY_PCT" = "100" ]; then
  echo "Routing 100% traffic to latest revision..."
  gcloud run services update-traffic "$SERVICE_NAME" --to-latest --region="$REGION" --project="$PROJECT_ID"
else
  echo "Gradual rollout: $CANARY_PCT% to new revision (manual: gcloud run services update-traffic $SERVICE_NAME --to-revisions REVISION=$CANARY_PCT,...)"
  gcloud run services update-traffic "$SERVICE_NAME" --to-latest --region="$REGION" --project="$PROJECT_ID"
fi

echo "Done. Service URL: $(gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format='value(status.url)')"
