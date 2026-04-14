# 01Deck Deploy Now

This is the fastest realistic deployment path for the current repo:

- frontend: `Vercel`
- backend: `Google Cloud Run`
- identity later: `OIDC + 01protocol`

Why this path:

- `vercel.json` already exists
- `01Evolve` already has a production Dockerfile
- this gets a beta live quickly without blocking on the future desktop shell

## Current Scope

Deploy now:

- `01Deck` frontend
- `01Evolve` API
- local-first storage design
- OAuth-ready environment surface

Do not block deploy on:

- full production OAuth
- full 01protocol challenge-response auth
- Tauri packaging

Those should be the next upgrade, not the reason the beta never ships.

## Required Accounts

- `Vercel`
- `Google Cloud`
- your DNS provider

## Required Secrets

Backend:

- `OPENAI_API_KEY`
- `BETA_ACCESS_TOKEN`
- `01DECK_SESSION_SECRET`

Frontend env:

- `VITE_01EVOLVE_API_BASE_URL`
- `VERCEL_TOKEN`
- optional `VERCEL_PROJECT_ID`
- optional `VERCEL_ORG_ID`

Optional next-step auth env:

- `01DECK_OAUTH_ENABLED`
- `01DECK_OAUTH_ISSUER`
- `01DECK_OAUTH_CLIENT_ID`
- `01DECK_OAUTH_AUDIENCE`
- `01DECK_OAUTH_SCOPES`
- `01DECK_OAUTH_REDIRECT_URI`

## Backend First

From `01Deck/01Evolve`, use:

```bash
../scripts/deploy_backend_cloud_run.sh YOUR_GCP_PROJECT_ID
```

Then verify:

```bash
curl https://YOUR-CLOUD-RUN-URL/healthz
```

## Frontend Next

From `01Deck`, create `.env.production.local` with:

```bash
VITE_PRODUCT_PROFILE=deck
VITE_01EVOLVE_API_BASE_URL=https://YOUR-API-DOMAIN
```

Then run:

```bash
export VERCEL_TOKEN=your_vercel_token
# optional if the repo is not already linked:
export VERCEL_PROJECT_ID=your_project_id
export VERCEL_ORG_ID=your_team_or_personal_org_id

./scripts/deploy_frontend_vercel.sh
```

## Foundry Build

To verify the serious shell locally before shipping:

```bash
npm run build:foundry
```

## Local-First Runtime

The backend now supports a user-owned runtime tree. See:

- `LOCAL_FIRST_DEPLOYMENT.md`
- `PROTOCOL_AUTH_PLAN.md`

When the local companion or desktop shell is added, it should initialize:

```bash
cd 01Deck/01Evolve
python -m app.main init-local-home
```

## Recommended Rollout Order

1. deploy backend
2. deploy frontend
3. point frontend to backend
4. verify beta gate
5. add OAuth
6. add `01protocol` challenge-response binding
7. package desktop/local shell

## Reality Check

This gets the current product live.

It is not yet the final local-first `01protocol` showcase architecture.
It is the fastest stable beta path while we keep building toward that.
