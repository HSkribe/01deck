import {
  createAgent as createProtocolAgent,
  verifyFromText,
  createDelegationToken,
  verifyDelegationToken,
  serializeDelegationToken,
  parseDelegationToken,
} from '@01protocol/sdk';
import type { AgentId as ProtocolAgentId, DelegationToken, DelegationScope, DelegationVerifyResult, VerifyResult } from '@01protocol/sdk';
import type { Agent } from '../data/agents';

export type { ProtocolAgentId as AgentId, DelegationToken, DelegationScope, DelegationVerifyResult };

// ---------------------------------------------------------------------------
// Owner identity + mandatory owner binding
//
// verifyAgentRecord/verifyFromText (the SDK's low-level primitives, called
// directly below wherever a self-consistency check is needed) only prove
// that an identity record is
// internally self-consistent: required fields are present, the SHA-256
// integrity checksum matches, and the Ed25519 signature matches the public
// key *embedded in that same record*. That is a real, correctly-implemented
// check — but it proves nothing about who is behind the record, because a
// forger controls every field, including the "signer" key it's checked
// against. Anyone can generate a keypair, write any name/goal they like, and
// produce a record that sails through self-consistency.
//
// The actual trust layer is this section: a one-per-installation "owner"
// identity, and a delegation token — signed by the owner's private key,
// naming an agent's instanceId as the delegate — attached to every agent
// this installation creates. "Verified" in 01Deck's UI must always mean
// BOTH checks passed together (see composeVerification below), never
// self-consistency alone. This mirrors the pattern already used correctly
// by the 01deck-agent-platform skill / src/ondeck workbench
// (src/ondeck/store/useDeckStore.ts's makeAgent/refreshRuntimeState).
// ---------------------------------------------------------------------------

const OWNER_ROLE = 'owner';
const OWNER_GOAL = 'Human operator of this 01Deck instance | 01deck-app';
const DEFAULT_OWNER_SCOPE: DelegationScope = { actions: ['operate', 'sign', 'relay'] };
// 01Protocol delegation tokens require an expiry; an owner->agent binding is
// meant to last the agent's lifetime, so a fixed far-future date is used
// rather than modeling "never expires" as a special case downstream.
const NO_PRACTICAL_EXPIRY = '2999-01-01T00:00:00.000Z';

export interface OwnerIdentityState {
  identity: ProtocolAgentId;
  privateKeyHex: string;
}

/** Enroll the one-per-installation 01Protocol owner identity. Called lazily, the first time an agent needs to be bound to it. */
export function enrollOwnerIdentity(displayName: string): OwnerIdentityState {
  const created = createProtocolAgent({
    name: displayName,
    role: OWNER_ROLE,
    goal: OWNER_GOAL,
    includeMemory: false,
  });
  return { identity: created.agent, privateKeyHex: created.privateKeyHex };
}

/** Mandatory owner binding: a delegation token signed by the owner, naming this agent as the delegate. */
export function bindAgentToOwner(input: {
  owner: ProtocolAgentId;
  ownerPrivateKeyHex: string;
  agent: ProtocolAgentId;
  scope?: DelegationScope;
}): DelegationToken {
  return createDelegationToken({
    delegator: input.owner,
    delegatorPrivateKeyHex: input.ownerPrivateKeyHex,
    delegateInstanceId: input.agent.instanceId,
    scope: input.scope ?? DEFAULT_OWNER_SCOPE,
    expiresAt: NO_PRACTICAL_EXPIRY,
  });
}

/** Confirm an agent is still validly bound to the owner it claims (signature valid, not expired, both identities match). */
export function verifyOwnerBinding(input: {
  token: DelegationToken;
  owner: ProtocolAgentId;
  agent: ProtocolAgentId;
}): DelegationVerifyResult {
  return verifyDelegationToken({
    token: input.token,
    delegator: input.owner,
    delegate: input.agent,
    action: 'operate',
  });
}

export function serializeOwnerBinding(token: DelegationToken): string {
  return serializeDelegationToken(token);
}

export function parseOwnerBinding(text: string): DelegationToken {
  return parseDelegationToken(text);
}

// ---------------------------------------------------------------------------
// Deck-level identity payload: creation, and composing the two checks above
// into the single `verification.status` every UI surface reads.
// ---------------------------------------------------------------------------

export interface DeckProtocolPayload {
  protocolAgent: ProtocolAgentId;
  identityRecord: string;
  bundleRecord?: string;
  privateKeyHex?: string;
  verification: NonNullable<Agent['verification']>;
  /** Serialized delegation token binding this agent to `owner`. Every payload this function returns carries one — see CreateDeckProtocolParams.owner. */
  ownerDelegationRecord: string;
  /** The owner identity that issued ownerDelegationRecord, serialized in full so the binding can be independently re-verified later — see verifyDeckAgent. */
  ownerRecord: string;
  ownerInstanceId: string;
}

export interface CreateDeckProtocolParams {
  name: string;
  role: string;
  goal: string;
  memoryMode?: 'always_on' | 'session_only';
  serial?: number;
  totalSupply?: number;
  rarityLabel?: string;
  /**
   * Mandatory: every agent 01Deck creates is delegation-bound to an owner
   * identity at creation time — this is not optional. Callers get one from
   * AppContext's `ensureOwnerIdentity()` before calling this function. This
   * parameter is required (rather than defaulted/skippable) specifically so
   * a future call site cannot silently omit the binding the way
   * OnboardingFlow previously did.
   */
  owner: OwnerIdentityState;
}

export interface DeckVerificationResult {
  ok: boolean;
  status: 'verified' | 'unbound' | 'unverified' | 'legacy';
  summary: string;
  warnings: string[];
  error?: string;
  checksum?: string;
  instanceId?: string;
  source: 'identityRecord' | 'bundleRecord' | 'none';
  /** Name of the owner the binding was checked against, when a delegation token was present (whether or not it validated). */
  boundOwnerName?: string;
}

export interface ParsedDeckProtocolText extends DeckVerificationResult {
  protocolAgent?: ProtocolAgentId;
  identityRecord?: string;
  bundleRecord?: string;
  ownerDelegationRecord?: string;
  ownerRecord?: string;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

interface OwnerBindingCheck {
  valid: boolean;
  error?: string;
  warnings: string[];
  ownerName: string;
}

/**
 * Check an owner-binding delegation token against whatever owner identity is
 * available: the record embedded alongside the token (ownerFields.ownerRecord
 * — how self-created and self-contained imported/pasted agents carry it), or
 * failing that, a fallback owner identity supplied by the caller (how a
 * legacy agent that only stored ownerDelegationRecord, from before ownerRecord
 * was introduced, is still verifiable against this installation's known
 * owner). Returns null when there is no delegation token at all — i.e. the
 * record is at most self-signed.
 */
function checkOwnerBindingFields(
  agent: ProtocolAgentId,
  ownerFields: { ownerDelegationRecord?: string; ownerRecord?: string },
  fallbackOwner?: ProtocolAgentId | null,
): OwnerBindingCheck | null {
  if (!ownerFields.ownerDelegationRecord) return null;

  let token: DelegationToken;
  try {
    token = parseOwnerBinding(ownerFields.ownerDelegationRecord);
  } catch (err) {
    return {
      valid: false,
      warnings: [],
      error: err instanceof Error ? `Could not parse owner delegation token: ${err.message}` : 'Could not parse owner delegation token.',
      ownerName: 'unknown',
    };
  }

  let owner: ProtocolAgentId | undefined;
  if (ownerFields.ownerRecord) {
    const parsedOwner = safeJsonParse(ownerFields.ownerRecord);
    if (parsedOwner && typeof parsedOwner === 'object') {
      owner = parsedOwner as ProtocolAgentId;
    }
  }
  if (!owner && fallbackOwner) owner = fallbackOwner;

  if (!owner) {
    return {
      valid: false,
      warnings: [],
      error: 'A delegation token is attached, but no owner identity is available to verify it against.',
      ownerName: 'unknown',
    };
  }

  const result = verifyOwnerBinding({ token, owner, agent });
  return { valid: result.valid, error: result.error, warnings: result.warnings, ownerName: owner.name };
}

/** Compose the self-consistency check and the owner-binding check into the single status the UI trusts. Never reports 'verified' unless both passed. */
function composeVerification(
  selfCheck: VerifyResult,
  binding: OwnerBindingCheck | null,
  source: '01protocol' | 'bundle',
): NonNullable<Agent['verification']> {
  const lastCheckedAt = new Date().toISOString();

  if (!selfCheck.valid) {
    return { status: 'unverified', source, lastCheckedAt, warnings: selfCheck.warnings, error: selfCheck.error };
  }

  const checksum = selfCheck.agent.integrityChecksum;

  if (!binding) {
    return {
      status: 'unbound',
      source,
      lastCheckedAt,
      warnings: selfCheck.warnings,
      checksum,
      error: 'No owner-binding delegation token is attached to this identity — self-signed only.',
    };
  }

  if (!binding.valid) {
    return {
      status: 'unbound',
      source,
      lastCheckedAt,
      warnings: [...selfCheck.warnings, ...binding.warnings],
      checksum,
      error: binding.error ?? 'Owner-binding delegation token failed verification.',
      boundOwnerName: binding.ownerName,
    };
  }

  return {
    status: 'verified',
    source,
    lastCheckedAt,
    warnings: [...selfCheck.warnings, ...binding.warnings],
    checksum,
    boundOwnerName: binding.ownerName,
  };
}

/** Self-consistency + owner-binding, composed into one DeckVerificationResult. Shared by verifyDeckAgent and parseDeckProtocolText. */
function verifyIdentityWithBinding(
  identityText: string,
  ownerFields: { ownerDelegationRecord?: string; ownerRecord?: string },
  source: 'identityRecord' | 'bundleRecord',
  fallbackOwner?: ProtocolAgentId | null,
): DeckVerificationResult & { agent?: ProtocolAgentId } {
  const selfCheck = verifyFromText(identityText);

  if (!selfCheck.valid) {
    return {
      ok: false,
      status: 'unverified',
      summary: source === 'bundleRecord'
        ? 'Bundle identity failed the 01 Protocol verification standard.'
        : 'Agent failed the 01 Protocol verification standard.',
      warnings: selfCheck.warnings,
      error: selfCheck.error,
      source,
    };
  }

  const binding = checkOwnerBindingFields(selfCheck.agent, ownerFields, fallbackOwner);

  // `ok` tracks "this is a real, usable 01Protocol identity" (self-
  // consistency), true for both 'verified' and 'unbound' — a self-signed
  // record is still a legitimate identity, just not one this installation
  // can vouch for. `status` (and the badge callers derive from it) is what
  // must never conflate the two — see composeVerification.
  if (!binding) {
    return {
      ok: true,
      status: 'unbound',
      summary: 'Identity is self-consistent but carries no owner-binding delegation — this is self-signed, not verified.',
      warnings: selfCheck.warnings,
      error: 'No owner-binding delegation token is attached to this identity.',
      checksum: selfCheck.agent.integrityChecksum,
      instanceId: selfCheck.agent.instanceId,
      source,
      agent: selfCheck.agent,
    };
  }

  if (!binding.valid) {
    return {
      ok: true,
      status: 'unbound',
      summary: `Owner-binding delegation failed verification (${binding.error ?? 'invalid token'}) — treat as self-signed, not verified.`,
      warnings: [...selfCheck.warnings, ...binding.warnings],
      error: binding.error,
      checksum: selfCheck.agent.integrityChecksum,
      instanceId: selfCheck.agent.instanceId,
      source,
      boundOwnerName: binding.ownerName,
      agent: selfCheck.agent,
    };
  }

  return {
    ok: true,
    status: 'verified',
    summary: `Agent passes 01 Protocol verification and is delegation-bound to owner "${binding.ownerName}".`,
    warnings: [...selfCheck.warnings, ...binding.warnings],
    checksum: selfCheck.agent.integrityChecksum,
    instanceId: selfCheck.agent.instanceId,
    source,
    boundOwnerName: binding.ownerName,
    agent: selfCheck.agent,
  };
}

/** Create a fresh 01Protocol identity AND bind it to an owner in one step — see CreateDeckProtocolParams.owner. */
export function createDeckProtocolPayload(params: CreateDeckProtocolParams): DeckProtocolPayload {
  const created = createProtocolAgent({
    name: params.name,
    role: params.role,
    goal: params.goal,
    includeMemory: true,
    memoryMode: params.memoryMode ?? 'always_on',
    serialNumber: params.serial,
    totalSupply: params.totalSupply,
    rarityLabel: params.rarityLabel,
  });

  const identityRecord = JSON.stringify(created.agent, null, 2);
  const selfCheck = verifyFromText(identityRecord);

  const ownerBindingToken = bindAgentToOwner({
    owner: params.owner.identity,
    ownerPrivateKeyHex: params.owner.privateKeyHex,
    agent: created.agent,
  });
  const bindingResult = verifyOwnerBinding({
    token: ownerBindingToken,
    owner: params.owner.identity,
    agent: created.agent,
  });
  const binding: OwnerBindingCheck = {
    valid: bindingResult.valid,
    error: bindingResult.error,
    warnings: bindingResult.warnings,
    ownerName: params.owner.identity.name,
  };

  const source = created.bundle ? 'bundle' : '01protocol';

  return {
    protocolAgent: created.agent,
    identityRecord,
    bundleRecord: created.bundle ? JSON.stringify(created.bundle, null, 2) : undefined,
    privateKeyHex: created.privateKeyHex,
    verification: composeVerification(selfCheck, binding, source),
    ownerDelegationRecord: serializeOwnerBinding(ownerBindingToken),
    ownerRecord: JSON.stringify(params.owner.identity, null, 2),
    ownerInstanceId: params.owner.identity.instanceId,
  };
}

/**
 * Verify an agent already in the roster: self-consistency AND owner binding.
 * `installationOwner` is an optional fallback used only when the agent's own
 * stored fields don't already carry a full owner record (e.g. an agent
 * created before `ownerRecord` was introduced, which only has
 * `ownerDelegationRecord`) — it is never required for a well-formed record.
 */
export function verifyDeckAgent(
  agent: Pick<Agent, 'identityRecord' | 'bundleRecord' | 'ownerDelegationRecord' | 'ownerRecord'>,
  installationOwner?: ProtocolAgentId | null,
): DeckVerificationResult {
  if (agent.identityRecord) {
    const result = verifyIdentityWithBinding(agent.identityRecord, agent, 'identityRecord', installationOwner);
    const { agent: _agent, ...rest } = result;
    return rest;
  }

  if (agent.bundleRecord) {
    const parsed = safeJsonParse(agent.bundleRecord) as { identity?: unknown } | null;
    if (!parsed?.identity) {
      return {
        ok: false,
        status: 'unverified',
        summary: 'Bundle could not be parsed for verification.',
        warnings: [],
        error: 'Missing identity block in .01bundle payload.',
        source: 'bundleRecord',
      };
    }

    const result = verifyIdentityWithBinding(JSON.stringify(parsed.identity), agent, 'bundleRecord', installationOwner);
    const { agent: _agent, ...rest } = result;
    return rest;
  }

  return {
    ok: false,
    status: 'legacy',
    summary: 'No 01 Protocol identity record is attached to this agent yet.',
    warnings: [],
    error: 'Verification requires a stored .01ai or .01bundle payload.',
    source: 'none',
  };
}

/**
 * Parse and verify a pasted `.01ai`/`.01bundle` payload for Hub's
 * verify/import flow. A bundle-shaped payload may optionally carry sibling
 * `owner` and `ownerDelegation` fields alongside `identity` — when present
 * and valid, the pasted agent earns 'verified' from whatever owner identity
 * the payload itself claims (falling back to this installation's owner only
 * if the payload's delegation names it but omits the redundant embedded
 * record). Bare self-signed payloads — the only thing an attacker forging a
 * record with no owner cooperation can ever produce — land at 'unbound',
 * never 'verified'.
 */
export function parseDeckProtocolText(text: string, installationOwner?: ProtocolAgentId | null): ParsedDeckProtocolText {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ok: false,
      status: 'legacy',
      summary: 'Paste a .01ai or .01bundle payload to verify it.',
      warnings: [],
      error: 'No payload provided.',
      source: 'none',
    };
  }

  const parsed = safeJsonParse(trimmed) as { identity?: unknown; owner?: unknown; ownerDelegation?: unknown } | null;
  if (parsed && typeof parsed === 'object' && parsed.identity) {
    const identityRecord = JSON.stringify(parsed.identity, null, 2);
    const ownerRecord = parsed.owner && typeof parsed.owner === 'object' ? JSON.stringify(parsed.owner, null, 2) : undefined;
    const ownerDelegationRecord = parsed.ownerDelegation
      ? (typeof parsed.ownerDelegation === 'string' ? parsed.ownerDelegation : JSON.stringify(parsed.ownerDelegation, null, 2))
      : undefined;

    const result = verifyIdentityWithBinding(identityRecord, { ownerDelegationRecord, ownerRecord }, 'bundleRecord', installationOwner);
    const { agent: protocolAgent, ...rest } = result;

    return {
      ...rest,
      protocolAgent,
      identityRecord: protocolAgent ? identityRecord : undefined,
      bundleRecord: JSON.stringify(parsed, null, 2),
      ownerDelegationRecord,
      ownerRecord,
    };
  }

  const result = verifyIdentityWithBinding(trimmed, {}, 'identityRecord', installationOwner);
  const { agent: protocolAgent, ...rest } = result;

  return {
    ...rest,
    protocolAgent,
    identityRecord: protocolAgent ? trimmed : undefined,
  };
}
