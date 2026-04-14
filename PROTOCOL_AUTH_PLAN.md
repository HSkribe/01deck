# 01Deck Protocol-Aware Auth Plan

`01Deck` should authenticate both:

- the human user
- the local `01protocol` identity they control

## Recommended Model

Use:

- `OIDC + PKCE` for user login
- `01protocol` signed challenge-response for local identity proof

## Why This Is Better Than OAuth Alone

OAuth alone proves:

- who the user is with the identity provider

It does not prove:

- which local protocol identity they control
- which agent bundle or protocol record belongs to this device
- whether the current machine actually holds the expected `01protocol` key

That is where `01protocol` should be visible.

## Binding Flow

1. user signs in with OAuth
2. `01Deck` checks for a local protocol identity
3. if none exists, create one locally
4. backend issues a nonce
5. local client signs nonce with `01protocol` key
6. backend verifies signature and stores binding:
   - `oauth_subject`
   - `protocol_id`
   - `public_key`
   - `device_label`
7. session becomes `oidc+01protocol`

## Login Flow After Binding

1. user authenticates with OAuth
2. backend returns protocol challenge
3. local client signs challenge
4. backend verifies signature
5. app loads user workspace with local-first storage

## What To Store Local

- protocol private key
- protocol identity record
- agent bundles
- user settings
- exports
- logs
- reports
- local benchmark history

## What To Store In Cloud

- identity provider subject
- protocol public key
- protocol binding metadata
- optional team/workspace membership
- optional backup or sync metadata

## Minimal Next Implementation Steps

1. add an auth abstraction in the frontend so `AuthContext` can support:
   - demo local auth
   - OIDC auth
   - OIDC plus protocol proof
2. add backend endpoints for:
   - create protocol challenge
   - verify signed protocol challenge
   - register protocol binding
3. reuse the existing `01protocol` SDK already present in `vendor/01protocol-sdk`
4. store the local protocol identity in the local runtime tree instead of browser-only storage

## Showcase Value

This makes the product story stronger:

- `01Deck` is not just “an app with OAuth”
- it is a working example of how `01protocol` can anchor local-first identity, portability, and ownership
