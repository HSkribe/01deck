# 01Deck AWS infra (CDK)

Implements the architecture from the "01Deck Launch Dossier" (Section 05): CloudFront + WAF
in front of an S3-hosted Vite build for the frontend, and CloudFront + an ALB in front of a
Fargate service running the existing `01Evolve` FastAPI backend, backed by RDS Postgres.

**Honesty note:** this was written and reviewed for API correctness against `aws-cdk-lib`
2.170.0, but `npm install` is blocked by this sandbox's network policy, so it has **not**
been compiled or `cdk synth`'d here. Before a real deploy, run the verify steps below —
don't `cdk deploy` straight from this without that check.

## Prerequisites

- Node 18+ and the AWS CDK CLI (`npm install -g aws-cdk`, or just use the local devDependency via `npx`)
- An AWS account with the AWS connector/credentials actually authorized (this session's own
  AWS connector needs reconnecting first — see the Launch Dossier's asks)
- `cdk bootstrap` run once per account/region (`npx cdk bootstrap aws://ACCOUNT_ID/REGION`)
- Docker available wherever `cdk deploy` runs, so `ecs.ContainerImage.fromAsset(...)` can
  build the existing `01Evolve/Dockerfile` and push it to ECR

## First deploy (no DNS yet)

By default `01deck:enableDns` is `false` in `cdk.json`, so the stack stands up cleanly on
CloudFront's own `*.cloudfront.net` domain and the ALB's `*.elb.amazonaws.com` domain —
useful for a first deploy before the `01ai.ai` hosted zone is delegated to this AWS account.

```bash
cd infra/aws-cdk
npm install
npx tsc --noEmit          # verify it actually compiles before touching real infra
npx cdk bootstrap          # once per account/region
npx cdk diff               # review what would be created
npx cdk deploy
```

The `CfnOutput`s print the CloudFront domain, ALB DNS name, and the ARNs of the two secrets
(`01deck/prod/app` and `01deck/prod/db-credentials`) — nothing sensitive is printed, just
where to go set real values.

## Populate the real secrets

`OPENAI_API_KEY` and `BETA_ACCESS_TOKEN` are created as placeholders. Set the real values
after deploy — never in this repo or in chat:

```bash
aws secretsmanager put-secret-value \
  --secret-id 01deck/prod/app \
  --secret-string '{"OPENAI_API_KEY":"sk-...","BETA_ACCESS_TOKEN":"<keep the generated one, or set your own>"}'
```

Then force a new Fargate deployment so the tasks pick up the new secret version:

```bash
aws ecs update-service --cluster <cluster-name> --service <service-name> --force-new-deployment
```

## Turning on deck.01ai.ai

Once the `01ai.ai` hosted zone is delegated to this AWS account:

1. Set `"01deck:enableDns": true` in `cdk.json`.
2. `npx cdk deploy` again — this adds the ACM certificate (DNS-validated against the
   existing hosted zone), attaches it to CloudFront, and creates the `deck.01ai.ai` alias
   record.

## What's deliberately not in phase 1

Per the dossier's Section 05, these are config changes on top of this same stack, not a
rebuild, and are left out until real traffic justifies them:

- Fargate autoscaling beyond the fixed `desiredCount: 2`
- An RDS read replica
- `multiAz: true` on the database

## Rough monthly cost (us-east-1, phase 1, before real traffic)

Ballpark only — check current AWS pricing before relying on this:

- NAT Gateway: ~$32 + data
- RDS `db.t4g.micro` single-AZ: ~$12
- 2x Fargate tasks (0.5 vCPU / 1GB): ~$30
- ALB: ~$16 + LCU
- CloudFront + S3 + WAF: usage-based, likely low double digits at launch traffic

## Lessons from the first real production deploy (2026-09-16)

The stack synthesized and diffed cleanly the whole time; every one of these only
surfaced by actually deploying and testing against the live URL. If you're touching
this stack or the 01Evolve app again, know these going in:

1. **`sh -c` silently drops every `01DECK_*` environment variable.** The Dockerfile's
   old `CMD ["sh", "-c", "uvicorn ... --port ${PORT:-8080}"]` ran uvicorn under `dash`,
   which refuses to carry forward environment variables whose names aren't valid POSIX
   shell identifiers (i.e. don't start with a letter or underscore) when spawning a
   child process. Every config var in this app is prefixed `01DECK_`, starting with a
   digit — all of them (`01DECK_ALLOWED_HOSTS`, `01DECK_ALLOWED_ORIGINS`,
   `01DECK_SECURE_COOKIE`) were reaching `None` inside the running process the entire
   time, regardless of what the task definition showed. Reproduce with
   `docker run -e "01DECK_ALLOWED_HOSTS=x" python:3.12-slim sh -c 'env | grep 01DECK'`
   — prints nothing. Fixed by switching the Dockerfile `CMD` to exec form with no shell
   wrapper (`PORT` is hardcoded via `ENV` in the same Dockerfile, so the `${PORT:-8080}`
   substitution was never doing anything real anyway).
2. **CloudFront forwards the `Host` header lowercased.** The `/api/*` behavior's origin
   is the ALB, whose CloudFormation-generated DNS name is mixed-case
   (`Deck01-ApiSe-...`). `TrustedHostMiddleware`-equivalent Host checks in `app.py` need
   a case-insensitive comparison, or every real request 400s.
3. **CloudFront forwards the full path, `/api` prefix included** — `OriginPath` on that
   origin is empty, nothing strips it. Every route in `app.py` is registered at the bare
   path (`/healthz`, `/account/signup`, no `/api` prefix), so every real request through
   the public URL 404'd. Worse: CloudFront's `CustomErrorResponses` (403/404 → SPA
   `index.html`, 200) silently rewrote that 404 into a *successful-looking* HTML
   response, which broke `JSON.parse` on the frontend without ever showing an error
   status anywhere. Fixed in `app.py`'s `add_security_headers` middleware by stripping
   `/api` from `request.scope["path"]` before routing, rather than renaming every route.
4. **CloudFront caches rewritten error pages for a long time**, independent of the
   matched behavior's own cache policy (even with `CachingDisabled` on `/api/*`) and
   independent of query-string cache-busting on the original request. If something was
   ever broken and 404ing, invalidate `/*` after fixing it — don't assume a fresh
   deploy alone clears stale error responses.
5. **The ECS deployment circuit breaker can trip on cold image pulls**, not just real
   app bugs — a genuinely new image means no cached layers on whatever Fargate host
   lands the task. `healthCheckGracePeriod` went from 60s to 180s and the target
   group's `unhealthyThresholdCount` from the default 2 to 5 to give real headroom.
6. **`/account/*` (signup/login/me/xp) intentionally does not require the beta access
   token** (`require_api_access`), unlike every other endpoint. That gate was built for
   "invite-only testers before public launch"; real accounts (password auth + rate
   limiting) are the access-control mechanism for account creation now. Don't add
   `require_api_access` back to those routes without knowing this was deliberate.

So roughly $100–150/month idle, before any real agent traffic — cheap enough to just ship
phase 1 rather than over-engineer for a launch spike that may not happen.
