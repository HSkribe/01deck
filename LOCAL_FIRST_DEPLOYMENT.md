# 01Deck Local-First Deployment Plan

This is the recommended deployment posture for `01Deck` and `01FOUNDRY` if we want:

- lightweight cloud usage,
- user-owned local data by default,
- OAuth-ready identity without moving most user content into hosted storage.

## Recommended Identity Model

Use `OIDC` with `Authorization Code + PKCE`.

That gives us:

- standard OAuth login,
- browser-safe auth flow,
- optional refresh tokens,
- the ability to store identity in the provider while keeping app data local.

## How 01protocol Should Fit Into Auth

Do not make `01protocol` compete with OAuth.

Use a two-layer model:

1. `OAuth/OIDC` proves the human user identity
2. `01protocol` proves the local protocol identity, device trust, and agent ownership

That lets `01Deck` act as a showcase for `01protocol` without forcing all auth into a custom identity stack on day one.

## Recommended Auth Flow

### Layer 1: Human Login

- user signs in with OIDC provider
- frontend receives tokens through PKCE
- backend verifies the user token

### Layer 2: 01protocol Binding

On first successful login:

- create or load a local `01protocol` identity bundle
- keep the protocol private key on the user machine
- register the public identity material with the backend
- bind:
  - `oauth_subject`
  - `protocol_id`
  - `device_label`
  - optional `bundle_record` metadata

On later sessions:

- backend sends a nonce challenge
- local client signs it with the `01protocol` key
- backend verifies the signature and treats that device/profile as protocol-bound

This gives us:

- cloud identity for the person
- local cryptographic proof for the protocol identity
- a strong story that `01Deck` is built on `01protocol`, not just decorated with it

## What 01protocol Auth Should Own

`01protocol` should be responsible for:

- local identity creation
- local key ownership
- signed proof of possession
- agent or bundle ownership metadata
- optional device trust and delegation

It should not be responsible for:

- social login UX
- password reset
- enterprise SSO
- email verification
- hosted account recovery

Those are better handled by the OIDC provider.

## Protocol-Aware Session Model

A good session object looks like:

- `user_id` from OAuth provider
- `protocol_id`
- `device_id`
- `session_id`
- `auth_method: oidc+01protocol`
- `scopes`
- `last_protocol_proof_at`

That gives us clean auditability and a strong protocol showcase.

## First-Run Local Files For Protocol Auth

Inside the local runtime tree, add:

```text
auth/
  oidc-session.json
  protocol-binding.json
  protocol-identity.01ai
  device-key.json
```

Recommended meaning:

- `oidc-session.json`
  cached local session metadata, not long-term secrets if avoidable
- `protocol-binding.json`
  mapping between OAuth user and local protocol identity
- `protocol-identity.01ai`
  local exported identity record
- `device-key.json`
  local protocol signing key or encrypted reference to it

If possible later, move private key storage into the OS keychain and keep only metadata on disk.

## Best-Fit OAuth Providers

Pick one of these:

1. `Zitadel`
2. `Auth0`
3. `Google Identity Platform`
4. `Keycloak` or `FusionAuth` if you want to self-host

My recommendation for this repo:

- `Zitadel` or `Auth0` if we want the fastest deploy with low ops overhead
- `Keycloak` only if we already want to own the auth infrastructure

## What OAuth Should Own

Cloud identity should own only:

- user identity
- login session
- refresh/access tokens
- optional organization/workspace membership

Cloud identity should not be the default home for:

- agent rosters
- prompt packs
- local memory/state
- benchmark artifacts
- reports
- exported bundles
- recordings and screenshots

Those should stay on the user machine by default.

## Suggested Dependencies

Frontend:

- `oidc-client-ts` for OIDC PKCE browser login
- optional `idb` if we want IndexedDB for larger local state instead of only `localStorage`

Backend:

- `authlib` or `python-jose[cryptography]` for JWT verification
- existing `fastapi` cookies/session middleware can remain for beta or local fallback

Desktop/local system:

- `sqlite` for local structured state
- local filesystem for artifacts, exports, logs, and bundles
- optional OS keychain integration later for refresh-token storage

Already added for capture/testing:

- `playwright`

## Recommended Local-First App Home

Default app home now resolves like this:

- macOS: `~/Library/Application Support/01AI/01deck`
- Linux: `~/.local/share/01AI/01deck`
- Windows: `%APPDATA%/01AI/01deck`
- override: `01AI_HOME=/custom/path`

The backend now defaults its SQLite file to:

- `db/01evolve.sqlite3`

## First-Run Directory Structure

Create this on first run:

```text
01AI/
  01deck/
    auth/
    cache/
    config/
    db/
      01evolve.sqlite3
    exports/
    logs/
    reports/
    state/
```

Recommended usage:

- `auth/`
  store OAuth metadata, token cache, and auth-session helpers
- `cache/`
  transient downloads and generated previews
- `config/`
  user settings, profile config, connector settings
- `db/`
  SQLite and migration artifacts
- `exports/`
  user-owned bundles and exports
- `logs/`
  app logs and troubleshooting output
- `reports/`
  benchmark reports and generated summaries
- `state/`
  durable local UI/application state

## First-Run Bootstrap

We now have a CLI initializer:

```bash
cd 01Deck/01Evolve
python -m app.main init-local-home
```

That creates the local runtime tree and prints the resolved paths.

## Recommended Deployment Shape

For a cloud-light beta:

1. host the frontend statically
2. keep the support API small and stateless where possible
3. use OAuth only for identity/session
4. keep user data local by default
5. make sync/export opt-in instead of mandatory

## Practical Next Steps

1. Replace the current demo `localStorage` auth in `src/app/context/AuthContext.tsx` with an OAuth abstraction layer.
2. Add backend JWT verification for the selected OIDC provider.
3. Move larger user-owned state from browser-only storage into the local runtime tree through a local companion or packaged desktop shell.
4. Define which data is:
   - local-only
   - sync-optional
   - cloud-required
5. Add a migration path from current browser demo auth to provider-backed login.

## Recommended Data Boundary

Default local:

- user profile preferences
- agent selections
- exports
- recordings
- benchmark artifacts
- report history
- local memories and caches

Cloud only when needed:

- identity
- billing/subscription
- optional shared team workspaces
- optional backup/sync metadata

That keeps `01Deck` deployable without turning it into a cloud-first platform.
