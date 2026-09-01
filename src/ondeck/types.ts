import type { Edge, Node } from '@xyflow/react';
import type { AgentId, DelegationToken } from './lib/protocol';

export type ToolName = 'calculator' | 'echo' | 'mock_api';

export interface AgentMessage {
  id: string;
  sender_agent_id: string;
  content?: string;
  ciphertext?: string;
  iv?: string;
  timestamp: string;
  signature?: string;
  sender_public_key?: string;
  kind: 'user' | 'assistant' | 'agent' | 'tool' | 'system';
  verification_status?: 'verified' | 'rejected' | 'local';
}

export interface MemoryEntry {
  id: string;
  content?: string;
  ciphertext?: string;
  iv?: string;
  timestamp: string;
  hash: string;
  previous_hash?: string;
}

export interface AgentModel {
  id: string; // 01Deck-local node id (canvas/store key) — independent of 01Protocol's instanceId
  name: string;
  system_prompt: string;
  model: string;
  temperature: number;
  memory: AgentMessage[];
  persistent_memory: MemoryEntry[];
  memory_enabled: boolean;
  summary: string;

  // 01Protocol identity — the single source of truth for who this agent is.
  // Never generated locally; always the result of protocol.enrollIdentity /
  // protocol.evolveIdentity. See src/ondeck/lib/protocol.ts.
  identity: AgentId;
  private_key_hex?: string; // session-only — never persisted, see serializeAgentForPersistence
  public_key: string; // mirrors identity.signerPublicKey, kept top-level for trust/relay comparisons
  signature_verified: boolean;
  needs_session_rekey: boolean;

  // Mandatory owner binding: a delegation token signed by the owner identity,
  // naming this agent's instanceId as the delegate. An agent without one is
  // not considered fully enrolled — see protocol.bindAgentToOwner.
  owner_delegation: DelegationToken;

  trusted_agents: string[]; // public keys of trusted peer agents
  allowed_tools: ToolName[];
  encryption_enabled: boolean;
  encryption_salt?: string;
  encryption_key?: CryptoKey;
}

export interface AgentTemplate {
  id: string;
  name: string;
  system_prompt: string;
  model: string;
  temperature: number;
  allowed_tools: ToolName[];
}

// The one-per-installation identity representing the human running this
// 01Deck instance. Created during first-run onboarding, before any agent
// can be enrolled — every agent's owner_delegation traces back to this.
export interface OwnerIdentityState {
  identity: AgentId;
  private_key_hex?: string; // session-only — never persisted
}

export interface ExportedAgent {
  version: 'ondeck-01protocol-1';
  exported_at: string;
  agent: Omit<AgentModel, 'private_key_hex' | 'encryption_key' | 'memory'> & {
    memory: AgentMessage[];
  };
}

export type AgentNodeData = {
  agentId: string;
};

export type AgentNode = Node<AgentNodeData>;
export type AgentEdge = Edge;
