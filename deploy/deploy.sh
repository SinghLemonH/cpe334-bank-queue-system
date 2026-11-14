#!/usr/bin/env bash
# ==============================================================================
# deploy/deploy.sh — First deployment script for CPE334 Bank Queue System
# Runs from Google Cloud Shell (Episode 5, R-03, C-04)
# ==============================================================================
set -euo pipefail

# ------------------------------------------------------------------------------
# Configuration (Explicitly required environment variables)
# ------------------------------------------------------------------------------
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-asia-southeast1}"
REPO_NAME="${REPO_NAME:-queue-repo}"

API_SERVICE_NAME="${API_SERVICE_NAME:-queue-api}"
WEB_SERVICE_NAME="${WEB_SERVICE_NAME:-queue-web}"
MIGRATE_JOB_NAME="${MIGRATE_JOB_NAME:-queue-migrate}"
RUNTIME_SA_NAME="${RUNTIME_SA_NAME:-queue-runtime}"

# Supabase Session Pooler configuration: Strictly required from environment
: "${SUPABASE_HOST:?Error: SUPABASE_HOST environment variable must be set (e.g. aws-0-ap-southeast-1.pooler.supabase.com)}"
: "${SUPABASE_USER:?Error: SUPABASE_USER environment variable must be set (e.g. postgres.<project-ref>)}"
SUPABASE_PORT="${SUPABASE_PORT:-5432}"
SUPABASE_DB="${SUPABASE_DB:-postgres}"

# Secret Manager secret names (Issue #23)
SECRET_DB_PASS="${SECRET_DB_PASS:-DATABASE_PASSWORD}"
SECRET_SEED_PASS="${SECRET_SEED_PASS:-SEED_DEMO_PASSWORD}"

DRY_RUN="${DRY_RUN:-0}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Error: PROJECT_ID is not set. Set it with: export PROJECT_ID=your-project-id" >&2
  exit 1
fi

COMMIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "manual-deploy-$(date +%s)")
RUNTIME_SA_EMAIL="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

API_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${API_SERVICE_NAME}:${COMMIT_SHA}"
WEB_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${WEB_SERVICE_NAME}:${COMMIT_SHA}"

echo "========================================================================"
echo "Bank Queue System — First GCP Deployment"
echo "Project ID     : $PROJECT_ID"
echo "Region         : $REGION"
echo "Commit SHA     : $COMMIT_SHA"
echo "Runtime SA     : $RUNTIME_SA_EMAIL"
echo "Dry Run        : $DRY_RUN"
echo "========================================================================"

run_cmd() {
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[DRY_RUN] $*"
  else
    echo "+ $*"
    "$@"
  fi
}

# ------------------------------------------------------------------------------
# Step 1: Ensure Artifact Registry Repository Exists
# ------------------------------------------------------------------------------
echo "--- [1/6] Checking Artifact Registry repository ---"
if [[ "$DRY_RUN" == "1" ]]; then
  echo "[DRY_RUN] gcloud artifacts repositories describe $REPO_NAME --location=$REGION --project=$PROJECT_ID || create"
else
  if ! gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
    run_cmd gcloud artifacts repositories create "$REPO_NAME" \
      --repository-format=docker \
      --location="$REGION" \
      --description="Docker repository for Bank Queue System" \
      --project="$PROJECT_ID"
  else
    echo "Artifact Registry repository $REPO_NAME already exists."
  fi
fi

# ------------------------------------------------------------------------------
# Step 2: Build & Push Docker Images via Docker in Cloud Shell
# ------------------------------------------------------------------------------
echo "--- [2/6] Building and pushing Docker images (API & Web) ---"
run_cmd gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
run_cmd docker build -f apps/api/Dockerfile -t "$API_IMAGE" .
run_cmd docker push "$API_IMAGE"
run_cmd docker build -f apps/web/Dockerfile -t "$WEB_IMAGE" .
run_cmd docker push "$WEB_IMAGE"

# ------------------------------------------------------------------------------
# Step 3: Deploy or Update Cloud Run Job (queue-migrate)
# ------------------------------------------------------------------------------
echo "--- [3/6] Configuring Cloud Run migration job ($MIGRATE_JOB_NAME) ---"
run_cmd gcloud run jobs deploy "$MIGRATE_JOB_NAME" \
  --image="$API_IMAGE" \
  --region="$REGION" \
  --service-account="$RUNTIME_SA_EMAIL" \
  --command="npm" \
  --args="run,db:prepare:prod" \
  --set-env-vars="NODE_ENV=production,DATABASE_HOST=${SUPABASE_HOST},DATABASE_PORT=${SUPABASE_PORT},DATABASE_USER=${SUPABASE_USER},DATABASE_NAME=${SUPABASE_DB},DATABASE_SSL=true,DATABASE_SSL_REJECT_UNAUTHORIZED=false,DB_POOL_MAX=5,APP_TIMEZONE=Asia/Bangkok" \
  --set-secrets="DATABASE_PASSWORD=${SECRET_DB_PASS}:latest,SEED_DEMO_PASSWORD=${SECRET_SEED_PASS}:latest" \
  --max-retries=1 \
  --task-timeout=300s \
  --project="$PROJECT_ID"

# ------------------------------------------------------------------------------
# Step 4: Execute Database Migration & Seed
# ------------------------------------------------------------------------------
echo "--- [4/6] Executing database migration and seed job ---"
run_cmd gcloud run jobs execute "$MIGRATE_JOB_NAME" \
  --region="$REGION" \
  --wait \
  --project="$PROJECT_ID"

# ------------------------------------------------------------------------------
# Step 5: Deploy API Service (queue-api)
# ------------------------------------------------------------------------------
echo "--- [5/6] Deploying API Service ($API_SERVICE_NAME) ---"
run_cmd gcloud run deploy "$API_SERVICE_NAME" \
  --image="$API_IMAGE" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --service-account="$RUNTIME_SA_EMAIL" \
  --set-env-vars="NODE_ENV=production,DATABASE_HOST=${SUPABASE_HOST},DATABASE_PORT=${SUPABASE_PORT},DATABASE_USER=${SUPABASE_USER},DATABASE_NAME=${SUPABASE_DB},DATABASE_SSL=true,DATABASE_SSL_REJECT_UNAUTHORIZED=false,DB_POOL_MAX=5,COOKIE_SECURE=true,APP_TIMEZONE=Asia/Bangkok,GIT_SHA=${COMMIT_SHA}" \
  --set-secrets="DATABASE_PASSWORD=${SECRET_DB_PASS}:latest" \
  --min-instances=0 \
  --max-instances=2 \
  --memory=512Mi \
  --cpu=1 \
  --port=3001 \
  --project="$PROJECT_ID"

API_URL=""
if [[ "$DRY_RUN" != "1" ]]; then
  API_URL=$(gcloud run services describe "$API_SERVICE_NAME" --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)')
  echo "API deployed at: $API_URL"
else
  API_URL="https://${API_SERVICE_NAME}-mock.a.run.app"
fi

# ------------------------------------------------------------------------------
# Step 6: Deploy Web Service (queue-web) with Runtime API_BASE_URL
# Note: PORT env var is omitted as Cloud Run manages PORT automatically
# ------------------------------------------------------------------------------
echo "--- [6/6] Deploying Web Service ($WEB_SERVICE_NAME) ---"
run_cmd gcloud run deploy "$WEB_SERVICE_NAME" \
  --image="$WEB_IMAGE" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --service-account="$RUNTIME_SA_EMAIL" \
  --set-env-vars="NODE_ENV=production,API_BASE_URL=${API_URL},GIT_SHA=${COMMIT_SHA}" \
  --min-instances=0 \
  --max-instances=2 \
  --memory=512Mi \
  --cpu=1 \
  --port=3000 \
  --project="$PROJECT_ID"

echo "========================================================================"
if [[ "$DRY_RUN" == "1" ]]; then
  echo "Dry run completed successfully. No cloud resources were modified."
else
  WEB_URL=$(gcloud run services describe "$WEB_SERVICE_NAME" --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)')
  echo "Deployment Completed Successfully!"
  echo "Web Service URL : $WEB_URL"
  echo "API Service URL : $API_URL"
  echo "Health Check    : $API_URL/api/health"
  echo "Readiness Check : $API_URL/api/ready"
  echo "========================================================================"
fi
