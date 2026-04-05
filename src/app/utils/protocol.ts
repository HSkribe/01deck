import { createAgent as createProtocolAgent, verifyFromText } from '@01protocol/sdk';
import type { AgentId as ProtocolAgentId } from '@01protocol/sdk';
import type { Agent } from '../data/agents';

export interface DeckProtocolPayload {
  protocolAgent: ProtocolAgentId;
  identityRecord: string;
  bundleRecord?: string;
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
