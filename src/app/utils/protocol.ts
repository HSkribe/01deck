import {
  createAgent as createProtocolAgent,
  verifyFromText,
  createDelegationToken,
  verifyDelegationToken,
  serializeDelegationToken,
  parseDelegationToken,
} from '@01protocol/sdk';
import type { AgentId as ProtocolAgentId, DelegationToken, DelegationScope, DelegationVerifyResult } from '@01protocol/sdk';
import type { Agent } from '../data/agents';

export type { ProtocolAgentId as AgentId, DelegationToken, DelegationScope, DelegationVerifyResult };

export interface DeckProtocolPayload {
  protocolAgent: ProtocolAgentId;
  identityRecord: string;
  bundleRecord?: string;
  privateKeyHex?: string;
  verification: NonNullable<Agent['verification']>;
}

export interface CreateDeckProtocolParams {
  name: string;
  role: string;
  goal: string;
  memoryMode?: 'always_on' | 'session_only';
  serial?: number;
  totalSupply?: number;
  rarityLabel?: string;
}

export interface DeckVerificationResult {
  ok: boolean;
  status: 'verified' | 'unverified' | 'legacy';
  summary: string;
  warnings: string[];
  error?: string;
  checksum?: string;
  instanceId?: string;
  source: 'identityRecord' | 'bundleRecord' | 'none';
}

export interface ParsedDeckProtocolText extends DeckVerificationResult {
  protocolAgent?: ProtocolAgentId;
  identityRecord?: string;
  bundleRecord?: string;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildVerificationState(
  result: ReturnType<typeof verifyFromText>,
  source: '01protocol' | 'bundle',
): NonNullable<Agent['verification']> {
  if (result.valid) {
    return {
      status: 'verified',
      source,
      lastCheckedAt: new Date().toISOString(),
      warnings: result.warnings,
      checksum: result.agent.integrityChecksum,
    };
  }

  return {
    status: 'unverified',
    source,
    lastCheckedAt: new Date().toISOString(),
    warnings: result.warnings,
    error: result.error,
  };
}

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
  const verificationResult = verifyFromText(identityRecord);

  return {
    protocolAgent: created.agent,
    identityRecord,
    bundleRecord: created.bundle ? JSON.stringify(created.bundle, null, 2) : undefined,
    privateKeyHex: created.privateKeyHex,
    verification: buildVerificationState(verificationResult, created.bundle ? 'bundle' : '01protocol'),
  };
}

export function verifyDeckAgent(agent: Pick<Agent, 'identityRecord' | 'bundleRecord'>): DeckVerificationResult {
  if (agent.identityRecord) {
    const result = verifyFromText(agent.identityRecord);
    if (result.valid) {
      return {
        ok: true,
        status: 'verified',
        summary: 'Agent passes the 01 Protocol verification standard.',
        warnings: result.warnings,
        checksum: result.agent.integrityChecksum,
        instanceId: result.agent.instanceId,
        source: 'identityRecord',
      };
    }

    return {
      ok: false,
      status: 'unverified',
      summary: 'Agent failed the 01 Protocol verification standard.',
      warnings: result.warnings,
      error: result.error,
      source: 'identityRecord',
    };
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

    const result = verifyFromText(JSON.stringify(parsed.identity));
    if (result.valid) {
      return {
        ok: true,
        status: 'verified',
        summary: 'Bundle identity passes the 01 Protocol verification standard.',
        warnings: result.warnings,
        checksum: result.agent.integrityChecksum,
        instanceId: result.agent.instanceId,
        source: 'bundleRecord',
      };
    }

    return {
      ok: false,
      status: 'unverified',
      summary: 'Bundle identity failed the 01 Protocol verification standard.',
      warnings: result.warnings,
      error: result.error,
      source: 'bundleRecord',
    };
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

export function parseDeckProtocolText(text: string): ParsedDeckProtocolText {
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

  const parsed = safeJsonParse(trimmed) as { identity?: unknown } | null;
  if (parsed && typeof parsed === 'object' && parsed.identity) {
    const identityRecord = JSON.stringify(parsed.identity, null, 2);
    const result = verifyFromText(identityRecord);
    if (result.valid) {
      return {
        ok: true,
        status: 'verified',
        summary: 'Bundle identity passes the 01 Protocol verification standard.',
        warnings: result.warnings,
        checksum: result.agent.integrityChecksum,
        instanceId: result.agent.instanceId,
        source: 'bundleRecord',
        protocolAgent: result.agent,
        identityRecord,
        bundleRecord: JSON.stringify(parsed, null, 2),
      };
    }

    return {
      ok: false,
      status: 'unverified',
      summary: 'Bundle identity failed the 01 Protocol verification standard.',
      warnings: result.warnings,
      error: result.error,
      source: 'bundleRecord',
      bundleRecord: JSON.stringify(parsed, null, 2),
    };
  }

  const result = verifyFromText(trimmed);
  if (result.valid) {
    return {
      ok: true,
      status: 'verified',
      summary: 'Agent passes the 01 Protocol verification standard.',
      warnings: result.warnings,
      checksum: result.agent.integrityChecksum,
      instanceId: result.agent.instanceId,
      source: 'identityRecord',
      protocolAgent: result.agent,
      identityRecord: JSON.stringify(result.agent, null, 2),
    };
  }

  return {
    ok: false,
    status: 'unverified',
    summary: 'The pasted payload does not pass the 01 Protocol verification standard.',
    warnings: result.warnings,
    error: result.error,
    source: 'none',
  };
}

// ---------------------------------------------------------------------------
// Owner identity + mandatory owner binding
//
// Every agent created in 01Deck already gets its own 01Protocol identity
// (above). This section adds the piece that ties that identity back to the
// human running this installation: a one-per-installation "owner" identity,
// and a delegation token — signed by the owner's private key, naming the
// agent's instanceId as the delegate — attached to every agent at creation
// time. See AppContext's `ensureOwnerIdentity` (lazily creates the owner
// identity on first use) and AgentCreatorModal's `buildAgent` (calls
// `bindAgentToOwner` for every new agent). This mirrors the same pattern
// used by the 01deck-agent-platform skill / src/ondeck workbench.
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
