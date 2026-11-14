#!/usr/bin/env bash
# ==============================================================================
# deploy/release.sh — Automated digest-based release script for CI/CD
# Invoked from .github/workflows/deploy.yml (Episode 7, R-07, R-08)
#
# Arguments:
#   $1 - Commit SHA (Full 40-character SHA)
# ==============================================================================
set -euo pipefail

COMMIT_SHA="${1:-${GITHUB_SHA:-}}"
if [[ -z "$COMMIT_SHA" ]]; then
  echo "Error: COMMIT_SHA is required as the first argument or GITHUB_SHA environment variable." >&2
  exit 1
fi

PROJECT_ID="${GCP_PROJECT_ID:-${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}}"
if [[ -z "$PROJECT_ID" ]]; then
  echo "Error: PROJECT_ID / GCP_PROJECT_ID is not set." >&2
  exit 1
fi

REGION="${GCP_REGION:-${REGION:-asia-southeast1}}"
REPO_NAME="${REPO_NAME:-queue-repo}"

API_SERVICE_NAME="${API_SERVICE_NAME:-queue-api}"
WEB_SERVICE_NAME="${WEB_SERVICE_NAME:-queue-web}"
MIGRATE_JOB_NAME="${MIGRATE_JOB_NAME:-queue-migrate}"
RUNTIME_SA_NAME="${RUNTIME_SA_NAME:-queue-runtime}"
RUNTIME_SA_EMAIL="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Supabase Session Pooler configuration: Strictly required from environment
: "${SUPABASE_HOST:?Error: SUPABASE_HOST environment variable must be set}"
: "${SUPABASE_USER:?Error: SUPABASE_USER environment variable must be set}"
SUPABASE_PORT="${SUPABASE_PORT:-5432}"
SUPABASE_DB="${SUPABASE_DB:-postgres}"

SECRET_DB_PASS="${SECRET_DB_PASS:-DATABASE_PASSWORD}"
SECRET_SEED_PASS="${SECRET_SEED_PASS:-SEED_DEMO_PASSWORD}"
SKIP_MIGRATE="${SKIP_MIGRATE:-0}"

API_IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${API_SERVICE_NAME}:${COMMIT_SHA}"
WEB_IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${WEB_SERVICE_NAME}:${COMMIT_SHA}"

echo "========================================================================"
echo "Executing Release for Commit: $COMMIT_SHA"
echo "Project : $PROJECT_ID | Region: $REGION | Skip Migrate: $SKIP_MIGRATE"
echo "========================================================================"

# ------------------------------------------------------------------------------
# 1. Resolve Image Digests (Immutable deployment)
# ------------------------------------------------------------------------------
echo "--- [1/5] Resolving image digests from Artifact Registry ---"
API_DIGEST=$(gcloud artifacts docker images describe "$API_IMAGE_TAG" \
  --format='value(image_summary.digest)')
WEB_DIGEST=$(gcloud artifacts docker images describe "$WEB_IMAGE_TAG" \
  --format='value(image_summary.digest)')

if [[ -z "$API_DIGEST" || -z "$WEB_DIGEST" ]]; then
  echo "Error: Failed to resolve digests for $API_IMAGE_TAG or $WEB_IMAGE_TAG" >&2
  exit 1
fi

API_IMAGE_BY_DIGEST="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${API_SERVICE_NAME}@${API_DIGEST}"
WEB_IMAGE_BY_DIGEST="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${WEB_SERVICE_NAME}@${WEB_DIGEST}"

echo "API Image Digest : $API_IMAGE_BY_DIGEST"
echo "Web Image Digest : $WEB_IMAGE_BY_DIGEST"

# ------------------------------------------------------------------------------
# 2 & 3. Update & Execute Migration Job (Skipped on Rollbacks)
# ------------------------------------------------------------------------------
if [[ "$SKIP_MIGRATE" == "1" ]]; then
  echo "--- [2/5 & 3/5] Skipping database migrations (Rollback mode) ---"
else
  echo "--- [2/5] Updating migration job ($MIGRATE_JOB_NAME) to new release image ---"
  gcloud run jobs update "$MIGRATE_JOB_NAME" \
    --image="$API_IMAGE_BY_DIGEST" \
    --region="$REGION" \
    --service-account="$RUNTIME_SA_EMAIL" \
    --command="npm" \
    --args="run,db:prepare:prod" \
    --set-env-vars="NODE_ENV=production,DATABASE_HOST=${SUPABASE_HOST},DATABASE_PORT=${SUPABASE_PORT},DATABASE_USER=${SUPABASE_USER},DATABASE_NAME=${SUPABASE_DB},DATABASE_SSL=true,DATABASE_SSL_REJECT_UNAUTHORIZED=false,DB_POOL_MAX=5,APP_TIMEZONE=Asia/Bangkok" \
    --set-secrets="DATABASE_PASSWORD=${SECRET_DB_PASS}:latest,SEED_DEMO_PASSWORD=${SECRET_SEED_PASS}:latest" \
    --project="$PROJECT_ID"

  echo "--- [3/5] Running database migrations ---"
  gcloud run jobs execute "$MIGRATE_JOB_NAME" \
    --region="$REGION" \
    --wait \
    --project="$PROJECT_ID"
fi

# ------------------------------------------------------------------------------
# 4. Deploy API Service by Digest
# ------------------------------------------------------------------------------
echo "--- [4/5] Deploying API Service revision ($API_SERVICE_NAME) ---"
gcloud run deploy "$API_SERVICE_NAME" \
  --image="$API_IMAGE_BY_DIGEST" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --service-account="$RUNTIME_SA_EMAIL" \
  --set-env-vars="NODE_ENV=production,DATABASE_HOST=${SUPABASE_HOST},DATABASE_PORT=${SUPABASE_PORT},DATABASE_USER=${SUPABASE_USER},DATABASE_NAME=${SUPABASE_DB},DATABASE_SSL=true,DATABASE_SSL_REJECT_UNAUTHORIZED=false,DB_POOL_MAX=5,COOKIE_SECURE=true,APP_TIMEZONE=Asia/Bangkok,GIT_SHA=${COMMIT_SHA}" \
  --set-secrets="DATABASE_PASSWORD=${SECRET_DB_PASS}:latest" \
  --min-instances=0 \
  --max-instances=2 \
  --port=3001 \
  --project="$PROJECT_ID"

API_URL=$(gcloud run services describe "$API_SERVICE_NAME" --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)')

# ------------------------------------------------------------------------------
# 5. Deploy Web Service by Digest
# Note: PORT env var is omitted as Cloud Run manages PORT automatically
# ------------------------------------------------------------------------------
echo "--- [5/5] Deploying Web Service revision ($WEB_SERVICE_NAME) ---"
gcloud run deploy "$WEB_SERVICE_NAME" \
  --image="$WEB_IMAGE_BY_DIGEST" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --service-account="$RUNTIME_SA_EMAIL" \
  --set-env-vars="NODE_ENV=production,API_BASE_URL=${API_URL},GIT_SHA=${COMMIT_SHA}" \
  --min-instances=0 \
  --max-instances=2 \
  --port=3000 \
  --project="$PROJECT_ID"

WEB_URL=$(gcloud run services describe "$WEB_SERVICE_NAME" --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)')

echo "========================================================================"
echo "Release of $COMMIT_SHA completed successfully!"
echo "API URL : $API_URL"
echo "Web URL : $WEB_URL"
echo "API Digest : $API_DIGEST"
echo "Web Digest : $WEB_DIGEST"
echo "========================================================================"
