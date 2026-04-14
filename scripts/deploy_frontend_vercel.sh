#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
VERCEL_ARGS=()

cd "${REPO_ROOT}"

if ! command -v vercel >/dev/null 2>&1; then
  echo "Vercel CLI is not installed. Install with: npm i -g vercel" >&2
  exit 1
fi

if [ "${VERCEL_TOKEN:-}" != "" ]; then
  VERCEL_ARGS+=(--token "${VERCEL_TOKEN}")
fi

if [ ! -f ".env.production.local" ]; then
  echo ".env.production.local is missing." >&2
  echo "Create it with at least:" >&2
  echo "VITE_PRODUCT_PROFILE=deck" >&2
  echo "VITE_01EVOLVE_API_BASE_URL=https://YOUR-API-DOMAIN" >&2
  exit 1
fi

if [ "${VERCEL_PROJECT_ID:-}" != "" ] && [ "${VERCEL_ORG_ID:-}" != "" ]; then
  mkdir -p .vercel
  cat > .vercel/project.json <<EOF
{
  "projectId": "${VERCEL_PROJECT_ID}",
  "orgId": "${VERCEL_ORG_ID}"
}
EOF
fi

npm run build:deck
vercel deploy --prod --yes "${VERCEL_ARGS[@]}"
