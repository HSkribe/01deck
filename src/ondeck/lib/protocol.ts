import {
  createAgent,
  resignAgent,
  signOutput,
  serializeAgent,
  verifyAgentRecord,
  verifyFromText,
  createDelegationToken,
  verifyDelegationToken,
  serializeDelegationToken,
  parseDelegationToken,
} from '@01protocol/sdk';
import type {
  AgentId,
  CreateAgentParams,
  CreateAgentResult,
  VerifyResult,
  SignedOutput,
  DelegationToken,
  DelegationScope,
  DelegationVerifyResult,
} from '@01protocol/sdk';

export type {
  AgentId,
  CreateAgentParams,
  CreateAgentResult,
  VerifyResult,
  SignedOutput,
  DelegationToken,
  DelegationScope,
  DelegationVerifyResult,
};

/**
 * 01Deck's single entry point for agent identity.
 *
 * Every identity in 01Deck — the owner's and every agent's — comes from the
 * vendored `@01protocol/sdk`, never from a bespoke local keypair. This file
 * is the only place that package should be imported from; everything else
 * in `ondeck/` goes through these functions so the identity model stays in
 * one place if the SDK's API ever changes.
 *
 * Owner binding is mandatory, not optional: `createAgentFromTemplate` in
 * `store/useDeckStore.ts` will not add an agent to the canvas until
 * `bindAgentToOwner` has produced a signed delegation token linking that
 * agent back to the owner identity. See the `01deck-platform-integration`
 * skill for the full rationale.
 */

const OWNER_ROLE = 'owner';
const OWNER_GOAL = 'Human operator of this 01Deck instance | 01deck-platform';
const DEFAULT_DELEGATION_SCOPE: DelegationScope = { actions: ['operate', 'sign', 'relay'] };
// 01Protocol delegation tokens require an expiry; 01Deck owner bindings are
// meant to last the lifetime of the agent, so we use a fixed far-future date
// rather than modeling "never expires" as a special case downstream.
const NO_PRACTICAL_EXPIRY = '2999-01-01T00:00:00.000Z';

/** Enroll a brand-new agent identity. Returns the identity plus its private key — the caller must surface the key to the user once and never persist it. */
export function enrollIdentity(params: CreateAgentParams): CreateAgentResult {
  return createAgent(params);
}

/** Enroll the one-per-installation owner identity. Called during first-run onboarding, before any agent can be created. */
export function enrollOwnerIdentity(displayName: string): CreateAgentResult {
  return createAgent({
    name: displayName,
    role: OWNER_ROLE,
    goal: OWNER_GOAL,
    includeMemory: false,
  });
}

/** Evolve an existing identity in place (config change, resign after edit) — same instanceId, new integrityChecksum + signature. */
export function evolveIdentity(agent: AgentId, privateKeyHex: string, updates?: Partial<AgentId>): AgentId {
  return resignAgent(agent, privateKeyHex, updates);
}

/** Sign a piece of agent output so its provenance can be checked later. */
export function signAsAgent(content: string, agent: AgentId, privateKeyHex: string): SignedOutput {
  return signOutput(content, agent, privateKeyHex);
}

/** Verify an identity record's integrity + signature. */
export function verifyIdentity(agent: AgentId): VerifyResult {
  return verifyAgentRecord(agent as unknown as Record<string, unknown>);
}

/** Verify an identity record from raw imported text (e.g. a pasted .01ai/.01bundle file). */
export function verifyIdentityText(text: string): VerifyResult {
  return verifyFromText(text);
}

/** Serialize an identity to its portable JSON form. */
export function exportIdentity(agent: AgentId): string {
  return serializeAgent(agent);
}

/**
 * Bind a newly enrolled agent to its owner. This is the mandatory step that
 * ties every 01Deck agent to the human who created it: a delegation token
 * signed by the owner's private key, naming the agent's instanceId as the
 * delegate. No agent identity is considered complete without one.
 */
export function bindAgentToOwner(input: {
  owner: AgentId;
  ownerPrivateKeyHex: string;
  agent: AgentId;
  scope?: DelegationScope;
  expiresAt?: string;
}): DelegationToken {
  return createDelegationToken({
    delegator: input.owner,
    delegatorPrivateKeyHex: input.ownerPrivateKeyHex,
    delegateInstanceId: input.agent.instanceId,
    scope: input.scope ?? DEFAULT_DELEGATION_SCOPE,
    expiresAt: input.expiresAt ?? NO_PRACTICAL_EXPIRY,
  });
}

/** Confirm an agent is still validly bound to the owner it claims (signature valid, not expired, both identities match) before trusting it to act. */
export function verifyOwnerBinding(input: {
  token: DelegationToken;
  owner: AgentId;
  agent: AgentId;
  action?: string;
}): DelegationVerifyResult {
  return verifyDelegationToken({
    token: input.token,
    delegator: input.owner,
    delegate: input.agent,
    action: input.action ?? 'operate',
  });
}

export function serializeOwnerBinding(token: DelegationToken): string {
  return serializeDelegationToken(token);
}

export function parseOwnerBinding(text: string): DelegationToken {
  return parseDelegationToken(text);
}
