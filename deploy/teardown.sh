#!/usr/bin/env bash
# ==============================================================================
# deploy/teardown.sh — Cloud Resource Cleanup Script
# (Episode 10, End of Term)
#
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
# CAUTION / WARNING:
# DO NOT RUN THIS SCRIPT BEFORE YOUR LAB / FINAL PROJECT WORK IS GRADED!
# The database connections, services, and artifact images will be deleted.
# Keep the service running until the instructor officially announces the end of grading.
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
# ==============================================================================
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
if [[ -z "$PROJECT_ID" ]]; then
  echo "Error: PROJECT_ID is not set. Set it before running teardown." >&2
  exit 1
fi
REGION="${REGION:-asia-southeast1}"
REPO_NAME="${REPO_NAME:-queue-repo}"

API_SERVICE_NAME="${API_SERVICE_NAME:-queue-api}"
WEB_SERVICE_NAME="${WEB_SERVICE_NAME:-queue-web}"
MIGRATE_JOB_NAME="${MIGRATE_JOB_NAME:-queue-migrate}"

echo "=============================================================================="
echo "WARNING: YOU ARE ABOUT TO TEAR DOWN ALL CLOUD RESOURCES FOR THIS PROJECT!"
echo "Project : $PROJECT_ID"
echo "Region  : $REGION"
echo "=============================================================================="

read -p "Type the exact Project ID to confirm teardown: " CONFIRM_PROJECT
if [[ "$CONFIRM_PROJECT" != "$PROJECT_ID" ]]; then
  echo "Confirmation does not match. Teardown aborted."
  exit 1
fi

echo "Deleting Cloud Run services..."
gcloud run services delete "$WEB_SERVICE_NAME" --region="$REGION" --project="$PROJECT_ID" --quiet || true
gcloud run services delete "$API_SERVICE_NAME" --region="$REGION" --project="$PROJECT_ID" --quiet || true

echo "Deleting Cloud Run job..."
gcloud run jobs delete "$MIGRATE_JOB_NAME" --region="$REGION" --project="$PROJECT_ID" --quiet || true

echo "Deleting Artifact Registry repository..."
gcloud artifacts repositories delete "$REPO_NAME" --location="$REGION" --project="$PROJECT_ID" --quiet || true

echo "=============================================================================="
echo "Teardown script completed."
echo "Note: Supabase Postgres project should be managed directly from the Supabase dashboard."
echo "=============================================================================="
