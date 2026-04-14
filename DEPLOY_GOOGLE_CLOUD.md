# 01Deck Google Cloud Beta Deploy

This repo is set up for a fast beta deploy with:

- frontend on `https://01deck.01ai.com`
- backend on `https://api.01deck.01ai.com`
- Firebase Hosting for the Vite frontend
- Cloud Run for the `01Evolve` API
- Secret Manager for backend secrets

## Architecture

- `01Deck/` builds to static assets in `dist/`
- `01Evolve/` runs as a containerized FastAPI service on Cloud Run
- the frontend talks to the backend via `VITE_01EVOLVE_API_BASE_URL`

## What You Need To Do In Google Cloud

### 1. Pick the Google project

- choose or create the GCP project that will host `01deck.01ai.com`
- enable billing for that project

### 2. Enable services

Enable:

- Cloud Run
- Artifact Registry
- Secret Manager
- Cloud Build
- Firebase Hosting

### 3. Add secrets in Secret Manager

Create these secrets:

- `OPENAI_API_KEY`
- `BETA_ACCESS_TOKEN`
- `01DECK_SESSION_SECRET`

Recommended values:

- `BETA_ACCESS_TOKEN`: a long random token for the beta gate
- `01DECK_SESSION_SECRET`: a different long random secret

### 4. Deploy the backend to Cloud Run

From `01Deck/01Evolve`:

```bash
gcloud run deploy 01deck-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_BASE_URL=https://api.openai.com/v1,OPENAI_MODEL=gpt-4.1-mini,01DECK_ALLOWED_ORIGINS=https://01deck.01ai.com,01DECK_ALLOWED_HOSTS=api.01deck.01ai.com,01DECK_SECURE_COOKIE=true \
  --set-secrets OPENAI_API_KEY=OPENAI_API_KEY:latest,BETA_ACCESS_TOKEN=BETA_ACCESS_TOKEN:latest,01DECK_SESSION_SECRET=01DECK_SESSION_SECRET:latest
```

After deploy:

- open the Cloud Run service URL
- confirm `/healthz` returns `{"ok": true}`

### 5. Map the backend custom domain

In Cloud Run:

- map `api.01deck.01ai.com` to the `01deck-api` service
- add the required DNS records at your DNS provider for `01ai.com`

### 6. Build the frontend

From the repo root:

```bash
cp .env.deck.example .env.deck.local
node ./node_modules/vite/bin/vite.js build --mode deck
```

This produces `dist/` using:

- `VITE_PRODUCT_PROFILE=deck`
- `VITE_01EVOLVE_API_BASE_URL=https://api.01deck.01ai.com`

### 7. Deploy the frontend to Firebase Hosting

Create a real `.firebaserc` from `.firebaserc.example`, then run:

```bash
firebase use deck-492413
firebase deploy --only hosting
```

### 8. Map the frontend custom domain

In Firebase Hosting:

- connect `01deck.01ai.com`
- add the DNS records Firebase gives you
- wait for SSL provisioning to complete

## Preflight Checks

Before using the beta live:

- `https://api.01deck.01ai.com/healthz` returns `200`
- `https://01deck.01ai.com` loads on desktop and mobile
- beta login works with `BETA_ACCESS_TOKEN`
- API requests include cookies and succeed after login
- no provider API keys appear in browser devtools
- only backend secrets live in Secret Manager, not in Git

## Current Beta Security Model

This repo is currently prepared for a beta gate, not full user accounts.

That means:

- users can be gated with `BETA_ACCESS_TOKEN`
- cookies are supported for beta session persistence
- this is not yet a full multi-user auth/data isolation model

For user accounts and saved personal data, the next upgrade should be:

- Firebase Auth or Google Identity Platform
- backend-side identity verification
- per-user persistence
- stronger production database than local SQLite
