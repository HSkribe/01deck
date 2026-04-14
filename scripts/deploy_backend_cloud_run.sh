#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "usage: $0 <gcp-project-id> [service-name] [region]" >&2
  exit 1
fi

PROJECT_ID="$1"
SERVICE_NAME="${2:-01deck-api}"
REGION="${3:-us-central1}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/01Evolve"

echo "Deploying ${SERVICE_NAME} to Cloud Run in ${PROJECT_ID}/${REGION}"

cd "${BACKEND_DIR}"

gcloud config set project "${PROJECT_ID}"

gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --region "${REGION}" \
  --allow-unauthenticated \
  --set-env-vars OPENAI_BASE_URL=https://api.openai.com/v1,OPENAI_MODEL=gpt-4.1-mini,01DECK_ALLOWED_ORIGINS=https://01deck.01ai.com,https://01foundry.01ai.com,01DECK_ALLOWED_HOSTS=api.01deck.01ai.com,api.01foundry.01ai.com,01DECK_SECURE_COOKIE=true,01DECK_ENV=production \
  --set-secrets OPENAI_API_KEY=OPENAI_API_KEY:latest,BETA_ACCESS_TOKEN=BETA_ACCESS_TOKEN:latest,01DECK_SESSION_SECRET=01DECK_SESSION_SECRET:latest

echo
echo "Next:"
echo "1. Map a custom domain to the Cloud Run service"
echo "2. Verify /healthz"
echo "3. Point the frontend env at the deployed API URL"
