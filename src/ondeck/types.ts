import type { Edge, Node } from '@xyflow/react';

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
  id: string;
  name: string;
  system_prompt: string;
  model: string;
  temperature: number;
  memory: AgentMessage[];
  persistent_memory: MemoryEntry[];
  memory_enabled: boolean;
  summary: string;
  public_key: string;
  private_key?: CryptoKey;
  state_hash: string;
  signature: string;
  trusted_agents: string[];
  allowed_tools: ToolName[];
  encryption_enabled: boolean;
  encryption_salt?: string;
  encryption_key?: CryptoKey;
  signature_verified: boolean;
  needs_session_rekey: boolean;
}

export interface AgentTemplate {
  id: string;
  name: string;
  system_prompt: string;
  model: string;
  temperature: number;
  allowed_tools: ToolName[];
}

export interface ExportedAgent {
  version: 'ondeck-mvp-1';
  exported_at: string;
  agent: Omit<AgentModel, 'private_key' | 'encryption_key' | 'memory'> & {
    memory: AgentMessage[];
  };
}

export type AgentNodeData = {
  agentId: string;
};

export type AgentNode = Node<AgentNodeData>;
export type AgentEdge = Edge;
