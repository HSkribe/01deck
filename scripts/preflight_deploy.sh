#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

echo "Checking frontend build..."
npm run build:deck >/dev/null

echo "Checking foundry build..."
npm run build:foundry >/dev/null

echo "Checking backend packaging files..."
test -f "01Evolve/pyproject.toml"
test -f "01Evolve/Dockerfile"

echo "Checking deploy configs..."
test -f "vercel.json"
test -f ".env.deck.example"
test -f ".env.example"
test -f ".env.foundry"

echo "Preflight passed."
