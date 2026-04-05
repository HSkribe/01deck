# Beta Deployment Checklist

This checklist assumes:
- `01Deck` is the frontend shell
- `01Evolve` is the protected API/backend
- beta users authenticate to the backend with a shared beta access token
- provider API keys remain server-side only

## 1. Environment Variables

Frontend:

```bash
VITE_01EVOLVE_API_BASE_URL=https://api.your-domain.example
```

Backend:

```bash
BETA_ACCESS_TOKEN=generate-a-long-random-token
01DECK_SESSION_SECRET=generate-a-second-long-random-secret
01DECK_ALLOWED_ORIGINS=https://deck.your-domain.example
01DECK_ALLOWED_HOSTS=api.your-domain.example,localhost,127.0.0.1
01DECK_SECURE_COOKIE=true

OPENAI_API_KEY=server-side-provider-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4.1-mini
```

## 2. Topology

Preferred production setup:
- frontend on `https://deck.your-domain.example`
- backend on `https://api.your-domain.example`
- TLS enabled for both
- frontend talks to backend over HTTPS with credentials included

If you can front both behind one domain, that is even better:
- `https://deck.your-domain.example/` -> frontend
- `https://deck.your-domain.example/api/*` -> reverse proxy to `01Evolve`

## 3. Reverse Proxy / Edge Requirements

Apply these at the proxy if possible:
- force HTTPS
- redirect `http` to `https`
- add HSTS on production domains
- disable directory listing
- set a request body limit appropriate for JSON API traffic
- forward `X-Forwarded-For` and `X-Forwarded-Proto`

Recommended headers at the edge:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy` tuned for your static asset/CDN setup
- `Permissions-Policy: microphone=(), camera=(), geolocation=()`

## 4. Backend Runtime

Run `01Evolve` behind a production ASGI server, for example:

```bash
uvicorn app.api.app:api --host 0.0.0.0 --port 8000
```

Before exposing it:
- confirm `BETA_ACCESS_TOKEN` is set
- confirm `01DECK_SESSION_SECRET` is set
- confirm `01DECK_SECURE_COOKIE=true`
- confirm `01DECK_ALLOWED_ORIGINS` matches the real frontend origin exactly
- confirm `01DECK_ALLOWED_HOSTS` matches the real backend hostname

## 5. Frontend Runtime

For a static deploy:

```bash
npm ci
npm run build
```

Deploy the generated `dist/` directory only.

Do not deploy:
- source zips
- local logs
- SQLite files from development
- `node_modules`
- temp directories

## 6. Preflight Verification

Before opening beta access:
- load the frontend over HTTPS
- confirm login with the beta access token succeeds
- confirm unauthenticated requests to protected backend routes return `401`
- confirm authenticated support-report/chat routes succeed
- confirm browser devtools never show a provider API key in outbound requests
- confirm cookies are `HttpOnly` and `Secure`
- confirm `npm audit` is clean
- confirm benchmark routes enforce reasonable limits

## 7. Operational Safety

For beta:
- rotate `BETA_ACCESS_TOKEN` if it leaks
- rotate `01DECK_SESSION_SECRET` if cookies are ever suspected compromised
- keep provider API keys server-side only
- log only route/result metadata, not raw customer prompts or tokens
- back up the SQLite database before major benchmark runs

## 8. Nice-To-Have Before Wider Release

- move SQLite to managed Postgres or a protected volume
- add structured request logging
- add per-user auth instead of a shared beta token
- add CSP and HSTS at the edge
- add automated integration tests for auth + support benchmark routes
