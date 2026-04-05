import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from '@xyflow/react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AGENT_TEMPLATES } from '../templates';
import {
  computeStateHash,
  decryptText,
  deriveAesKeyFromPassphrase,
  encryptText,
  generateAesKey,
  generateAgentIdentity,
  sha256Hex,
  signPayload,
  verifyAgentSignature,
  verifyPayload,
} from '../lib/crypto';
import { streamChatCompletion } from '../lib/llm';
import { executeTool } from '../lib/tools';
import type { AgentEdge, AgentMessage, AgentModel, AgentNode, AgentTemplate, ExportedAgent, MemoryEntry, ToolName } from '../types';

type PersistedAgent = Omit<AgentModel, 'private_key' | 'encryption_key' | 'memory'> & {
  memory: AgentMessage[];
};

type DeckState = {
  agents: Record<string, AgentModel>;
  nodes: AgentNode[];
  edges: AgentEdge[];
  selectedAgentId: string | null;
  apiBaseUrl: string;
  apiKey: string;
  streamingByAgent: Record<string, boolean>;
  streamingTextByAgent: Record<string, string>;
  errorByAgent: Record<string, string | null>;
  selectAgent: (agentId: string | null) => void;
  setApiBaseUrl: (value: string) => void;
  setApiKey: (value: string) => void;
  createAgentFromTemplate: (templateId: string, position: { x: number; y: number }) => Promise<void>;
  deleteAgent: (agentId: string) => void;
  onNodesChange: (changes: NodeChange<AgentNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AgentEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  updateAgentConfig: (agentId: string, patch: Partial<Pick<AgentModel, 'name' | 'system_prompt' | 'model' | 'temperature'>>) => Promise<void>;
  regenerateAgentIdentity: (agentId: string) => Promise<void>;
  toggleTrustedAgent: (agentId: string, trustedPublicKey: string) => void;
  toggleToolPermission: (agentId: string, tool: ToolName) => void;
  toggleMemory: (agentId: string) => void;
  clearPersistentMemory: (agentId: string) => void;
  setEncryptionEnabled: (agentId: string, enabled: boolean, passphrase?: string) => Promise<void>;
  unlockEncryption: (agentId: string, passphrase: string) => Promise<void>;
  clearEncryptedData: (agentId: string) => void;
  sendMessage: (agentId: string, input: string) => Promise<void>;
  relayToAgent: (fromAgentId: string, toAgentId: string, content?: string) => Promise<void>;
  exportAgent: (agentId: string) => string | null;
  importAgent: (payload: string, position: { x: number; y: number }) => Promise<{ ok: boolean; message: string }>;
  refreshRuntimeState: () => Promise<void>;
};

const SHORT_TERM_WINDOW = 10;
const PERSISTENT_MEMORY_LIMIT = 50;

function defaultSummary(): string {
  return 'No compressed conversation summary yet.';
}

function createNode(agentId: string, position: { x: number; y: number }): AgentNode {
  return {
    id: agentId,
    type: 'agentNode',
    position,
    data: { agentId },
    draggable: true,
  };
}

function serializeAgentForPersistence(agent: AgentModel): PersistedAgent {
  return {
    ...agent,
    private_key: undefined,
    encryption_key: undefined,
    memory: [],
    persistent_memory: agent.persistent_memory.map(entry => ({
      ...entry,
      content: agent.encryption_enabled ? undefined : entry.content,
    })),
  };
}

function summarizeMessages(messages: AgentMessage[], priorSummary: string): string {
  const olderMessages = messages.slice(0, Math.max(0, messages.length - SHORT_TERM_WINDOW));
  if (olderMessages.length === 0) return priorSummary || defaultSummary();

  const compact = olderMessages
    .map(message => {
      const speaker = message.kind === 'assistant' ? 'assistant' : message.sender_agent_id;
      const content = message.content ?? '[encrypted]';
      return `${speaker}: ${content}`;
    })
    .join(' ');

  const nextSummary = `${priorSummary === defaultSummary() ? '' : `${priorSummary} `}${compact}`.trim();
  return nextSummary.slice(-900) || defaultSummary();
}

function clampRecentMessages(messages: AgentMessage[]): AgentMessage[] {
  return messages.slice(-SHORT_TERM_WINDOW);
}

function extractKeywords(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(token => token.length > 3)
    .slice(0, 8);
}

async function decryptEntryContent(agent: AgentModel, entry: MemoryEntry): Promise<string | null> {
  if (entry.content) return entry.content;
  if (!entry.ciphertext || !entry.iv || !agent.encryption_key) return null;

  try {
    return await decryptText(agent.encryption_key, entry.ciphertext, entry.iv);
  } catch {
    return null;
  }
}

async function relevantMemory(agent: AgentModel, query: string): Promise<string[]> {
  const keywords = extractKeywords(query);
  const results: string[] = [];

  for (const entry of agent.persistent_memory) {
    const content = await decryptEntryContent(agent, entry);
    if (!content) continue;
    if (keywords.length === 0 || keywords.some(keyword => content.toLowerCase().includes(keyword))) {
      results.push(content);
    }
    if (results.length >= 5) break;
  }

  return results;
}

function toOpenAIMessages(agent: AgentModel, memories: string[]): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const systemEnvelope = [
    agent.system_prompt,
    '',
    'Identity:',
    `- public key: ${agent.public_key.slice(0, 18)}...`,
    `- state hash: ${agent.state_hash}`,
    `- signature verified: ${agent.signature_verified ? 'yes' : 'no'}`,
    '',
    `Summary: ${agent.summary || defaultSummary()}`,
    '',
    `Relevant persistent memory: ${memories.length > 0 ? memories.join(' | ') : 'none'}`,
    '',
    `Allowed tools: ${agent.allowed_tools.join(', ') || 'none'}`,
  ].join('\n');

  const recent = agent.memory.map(message => {
    if (message.kind === 'assistant' || message.kind === 'tool') {
      return {
        role: 'assistant' as const,
        content: message.content ?? '[encrypted assistant message]',
      };
    }

    if (message.kind === 'agent') {
      return {
        role: 'user' as const,
        content: `[Trusted agent ${message.sender_agent_id}] ${message.content ?? '[encrypted relay]'}`,
      };
    }

    return {
      role: 'user' as const,
      content: message.content ?? '[encrypted user message]',
    };
  });

  return [{ role: 'system', content: systemEnvelope }, ...recent];
}

async function createPersistentMemory(agent: AgentModel, content: string): Promise<MemoryEntry | null> {
  if (!agent.memory_enabled) return null;

  const timestamp = new Date().toISOString();
  const previous_hash = agent.persistent_memory.at(-1)?.hash;
  const hash = await sha256Hex(`${content}:${previous_hash ?? 'root'}:${timestamp}`);

  if (agent.encryption_enabled) {
    if (!agent.encryption_key) return null;
    const encrypted = await encryptText(agent.encryption_key, content);
    return {
      id: crypto.randomUUID(),
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      timestamp,
      hash,
      previous_hash,
    };
  }

  return {
    id: crypto.randomUUID(),
    content,
    timestamp,
    hash,
    previous_hash,
  };
}

async function appendPersistentMemoryEntry(agent: AgentModel, content: string): Promise<AgentModel> {
  const entry = await createPersistentMemory(agent, content);
  if (!entry) return agent;

  return {
    ...agent,
    persistent_memory: [...agent.persistent_memory, entry].slice(-PERSISTENT_MEMORY_LIMIT),
  };
}

async function makeAgent(template: AgentTemplate, position: { x: number; y: number }): Promise<{
  agent: AgentModel;
  node: AgentNode;
}> {
  const identity = await generateAgentIdentity(template);
  const agentId = crypto.randomUUID();
  const agent: AgentModel = {
    id: agentId,
    name: template.name,
    system_prompt: template.system_prompt,
    model: template.model,
    temperature: template.temperature,
    memory: [],
    persistent_memory: [],
    memory_enabled: true,
    summary: defaultSummary(),
    public_key: identity.public_key,
    private_key: identity.private_key,
    state_hash: identity.state_hash,
    signature: identity.signature,
    trusted_agents: [],
    allowed_tools: [...template.allowed_tools],
    encryption_enabled: false,
    signature_verified: true,
    needs_session_rekey: false,
  };

  return {
    agent,
    node: createNode(agentId, position),
  };
}

const initialState = {
  agents: {},
  nodes: [],
  edges: [],
  selectedAgentId: null,
  apiBaseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  streamingByAgent: {},
  streamingTextByAgent: {},
  errorByAgent: {},
};

export const useDeckStore = create<DeckState>()(
  persist(
    (set, get) => ({
      ...initialState,

      selectAgent: agentId => set({ selectedAgentId: agentId }),
      setApiBaseUrl: value => set({ apiBaseUrl: value }),
      setApiKey: value => set({ apiKey: value }),

      createAgentFromTemplate: async (templateId, position) => {
        const template = AGENT_TEMPLATES.find(item => item.id === templateId) ?? AGENT_TEMPLATES[0];
        const { agent, node } = await makeAgent(template, position);

        set(state => ({
          agents: { ...state.agents, [agent.id]: agent },
          nodes: [...state.nodes, node],
          selectedAgentId: agent.id,
        }));
      },

      deleteAgent: agentId =>
        set(state => {
          const nextAgents = { ...state.agents };
          delete nextAgents[agentId];
          return {
            agents: nextAgents,
            nodes: state.nodes.filter(node => node.id !== agentId),
            edges: state.edges.filter(edge => edge.source !== agentId && edge.target !== agentId),
            selectedAgentId: state.selectedAgentId === agentId ? null : state.selectedAgentId,
          };
        }),

      onNodesChange: changes => set(state => ({ nodes: applyNodeChanges(changes, state.nodes) })),
      onEdgesChange: changes => set(state => ({ edges: applyEdgeChanges(changes, state.edges) })),
      onConnect: connection =>
        set(state => ({
          edges: addEdge({ ...connection, animated: true }, state.edges),
        })),

      updateAgentConfig: async (agentId, patch) => {
        const agent = get().agents[agentId];
        if (!agent) return;

        const merged = { ...agent, ...patch };
        const state_hash = await computeStateHash(merged);

        if (merged.private_key) {
          const signature = await signPayload(merged.private_key, state_hash);
          set(state => ({
            agents: {
              ...state.agents,
              [agentId]: {
                ...merged,
                state_hash,
                signature,
                signature_verified: true,
                needs_session_rekey: false,
              },
            },
          }));
          return;
        }

        set(state => ({
          agents: {
            ...state.agents,
            [agentId]: {
              ...merged,
              state_hash,
              signature_verified: false,
              needs_session_rekey: true,
            },
          },
        }));
      },

      regenerateAgentIdentity: async agentId => {
        const agent = get().agents[agentId];
        if (!agent) return;
        const identity = await generateAgentIdentity(agent);
        set(state => ({
          agents: {
            ...state.agents,
            [agentId]: {
              ...agent,
              ...identity,
              signature_verified: true,
              needs_session_rekey: false,
            },
          },
        }));
      },

      toggleTrustedAgent: (agentId, trustedPublicKey) =>
        set(state => {
          const agent = state.agents[agentId];
          if (!agent) return state;
          const trusted_agents = agent.trusted_agents.includes(trustedPublicKey)
            ? agent.trusted_agents.filter(key => key !== trustedPublicKey)
            : [...agent.trusted_agents, trustedPublicKey];

          return {
            agents: {
              ...state.agents,
              [agentId]: {
                ...agent,
                trusted_agents,
              },
            },
          };
        }),

      toggleToolPermission: (agentId, tool) =>
        set(state => {
          const agent = state.agents[agentId];
          if (!agent) return state;
          const allowed_tools = agent.allowed_tools.includes(tool)
            ? agent.allowed_tools.filter(item => item !== tool)
            : [...agent.allowed_tools, tool];

          return {
            agents: {
              ...state.agents,
              [agentId]: {
                ...agent,
                allowed_tools,
              },
            },
          };
        }),

      toggleMemory: agentId =>
        set(state => {
          const agent = state.agents[agentId];
          if (!agent) return state;
          return {
            agents: {
              ...state.agents,
              [agentId]: {
                ...agent,
                memory_enabled: !agent.memory_enabled,
              },
            },
          };
        }),

      clearPersistentMemory: agentId =>
        set(state => {
          const agent = state.agents[agentId];
          if (!agent) return state;
          return {
            agents: {
              ...state.agents,
              [agentId]: {
                ...agent,
                persistent_memory: [],
                summary: defaultSummary(),
              },
            },
          };
        }),

      setEncryptionEnabled: async (agentId, enabled, passphrase) => {
        const agent = get().agents[agentId];
        if (!agent) return;

        if (!enabled) {
          set(state => ({
            agents: {
              ...state.agents,
              [agentId]: {
                ...agent,
                encryption_enabled: false,
                encryption_key: undefined,
                encryption_salt: undefined,
              },
            },
          }));
          return;
        }

        const encryption = passphrase
          ? await deriveAesKeyFromPassphrase(passphrase)
          : { key: await generateAesKey(), salt: undefined };

        set(state => ({
          agents: {
            ...state.agents,
            [agentId]: {
              ...agent,
              encryption_enabled: true,
              encryption_key: encryption.key,
              encryption_salt: encryption.salt,
            },
          },
        }));
      },

      unlockEncryption: async (agentId, passphrase) => {
        const agent = get().agents[agentId];
        if (!agent || !agent.encryption_enabled || !agent.encryption_salt) return;

        const derived = await deriveAesKeyFromPassphrase(passphrase, agent.encryption_salt);
        const hydratedMemory = await Promise.all(
          agent.persistent_memory.map(async entry => {
            if (!entry.ciphertext || !entry.iv) return entry;
            try {
              const content = await decryptText(derived.key, entry.ciphertext, entry.iv);
              return {
                ...entry,
                content,
              };
            } catch {
              return entry;
            }
          }),
        );

        set(state => ({
          agents: {
            ...state.agents,
            [agentId]: {
              ...agent,
              encryption_key: derived.key,
              persistent_memory: hydratedMemory,
            },
          },
        }));
      },

      clearEncryptedData: agentId =>
        set(state => {
          const agent = state.agents[agentId];
          if (!agent) return state;
          return {
            agents: {
              ...state.agents,
              [agentId]: {
                ...agent,
                memory: [],
                persistent_memory: [],
                summary: defaultSummary(),
              },
            },
            streamingTextByAgent: {
              ...state.streamingTextByAgent,
              [agentId]: '',
            },
          };
        }),

      sendMessage: async (agentId, input) => {
        const trimmed = input.trim();
        if (!trimmed) return;

        let agent = get().agents[agentId];
        if (!agent) return;

        const userMessage: AgentMessage = {
          id: crypto.randomUUID(),
          sender_agent_id: 'user',
          content: trimmed,
          timestamp: new Date().toISOString(),
          kind: 'user',
          verification_status: 'local',
        };

        agent = await appendPersistentMemoryEntry(agent, `User: ${trimmed}`);
        const userMemory = clampRecentMessages([...agent.memory, userMessage]);
        const summaryAfterUser = summarizeMessages([...agent.memory, userMessage], agent.summary);

        set(state => ({
          agents: {
            ...state.agents,
            [agentId]: {
              ...state.agents[agentId],
              ...agent,
              memory: userMemory,
              summary: summaryAfterUser,
            },
          },
          streamingByAgent: {
            ...state.streamingByAgent,
            [agentId]: true,
          },
          streamingTextByAgent: {
            ...state.streamingTextByAgent,
            [agentId]: '',
          },
          errorByAgent: {
            ...state.errorByAgent,
            [agentId]: null,
          },
        }));

        agent = get().agents[agentId];
        if (!agent) return;

        if (trimmed.startsWith('/tool ')) {
          const [, toolNameRaw, ...toolInputParts] = trimmed.split(' ');
          const toolName = toolNameRaw as ToolName;

          try {
            const output = await executeTool(agent, toolName, toolInputParts.join(' '));
            const toolMessage: AgentMessage = {
              id: crypto.randomUUID(),
              sender_agent_id: agent.id,
              content: output,
              timestamp: new Date().toISOString(),
              kind: 'tool',
              verification_status: 'local',
            };

            const withTool = await appendPersistentMemoryEntry(agent, `Tool ${toolName}: ${output}`);
            const combinedMessages = clampRecentMessages([...withTool.memory, toolMessage]);
            const summary = summarizeMessages([...withTool.memory, toolMessage], withTool.summary);

            set(state => ({
              agents: {
                ...state.agents,
                [agentId]: {
                  ...state.agents[agentId],
                  ...withTool,
                  memory: combinedMessages,
                  summary,
                },
              },
              streamingByAgent: {
                ...state.streamingByAgent,
                [agentId]: false,
              },
            }));
          } catch (error) {
            set(state => ({
              streamingByAgent: {
                ...state.streamingByAgent,
                [agentId]: false,
              },
              errorByAgent: {
                ...state.errorByAgent,
                [agentId]: error instanceof Error ? error.message : 'Tool execution failed.',
              },
            }));
          }
          return;
        }

        try {
          const memories = await relevantMemory(agent, trimmed);
          const finalText = await streamChatCompletion({
            apiBaseUrl: get().apiBaseUrl,
            apiKey: get().apiKey,
            model: agent.model,
            temperature: agent.temperature,
            messages: toOpenAIMessages(agent, memories),
            onToken: token => {
              set(state => ({
                streamingTextByAgent: {
                  ...state.streamingTextByAgent,
                  [agentId]: `${state.streamingTextByAgent[agentId] ?? ''}${token}`,
                },
              }));
            },
          });

          const assistantMessage: AgentMessage = {
            id: crypto.randomUUID(),
            sender_agent_id: agent.id,
            content: finalText,
            timestamp: new Date().toISOString(),
            kind: 'assistant',
            verification_status: 'local',
          };

          const persistedAgent = await appendPersistentMemoryEntry(agent, `Assistant: ${finalText}`);
          const nextMessages = clampRecentMessages([...persistedAgent.memory, assistantMessage]);
          const nextSummary = summarizeMessages([...persistedAgent.memory, assistantMessage], persistedAgent.summary);

          set(state => ({
            agents: {
              ...state.agents,
              [agentId]: {
                ...state.agents[agentId],
                ...persistedAgent,
                memory: nextMessages,
                summary: nextSummary,
              },
            },
            streamingByAgent: {
              ...state.streamingByAgent,
              [agentId]: false,
            },
            streamingTextByAgent: {
              ...state.streamingTextByAgent,
              [agentId]: '',
            },
          }));
        } catch (error) {
          set(state => ({
            streamingByAgent: {
              ...state.streamingByAgent,
              [agentId]: false,
            },
            errorByAgent: {
              ...state.errorByAgent,
              [agentId]: error instanceof Error ? error.message : 'Chat request failed.',
            },
          }));
        }
      },

      relayToAgent: async (fromAgentId, toAgentId, content) => {
        const { agents, edges } = get();
        const sender = agents[fromAgentId];
        const receiver = agents[toAgentId];
        if (!sender || !receiver) return;

        const hasEdge = edges.some(
          edge =>
            (edge.source === fromAgentId && edge.target === toAgentId) ||
            (edge.source === toAgentId && edge.target === fromAgentId),
        );
        if (!hasEdge) {
          set(state => ({
            errorByAgent: {
              ...state.errorByAgent,
              [fromAgentId]: 'Connect the two agents on the canvas before relaying messages.',
            },
          }));
          return;
        }

        if (!receiver.trusted_agents.includes(sender.public_key)) {
          set(state => ({
            errorByAgent: {
              ...state.errorByAgent,
              [fromAgentId]: `${receiver.name} does not trust ${sender.name} yet.`,
            },
          }));
          return;
        }

        if (!sender.private_key) {
          set(state => ({
            errorByAgent: {
              ...state.errorByAgent,
              [fromAgentId]: 'This agent needs a fresh session identity before it can sign relayed messages.',
            },
          }));
          return;
        }

        const fallbackContent =
          content?.trim() ||
          sender.memory.filter(message => message.kind === 'assistant' || message.kind === 'tool').at(-1)?.content ||
          'No recent assistant output was available to relay.';

        const payload = JSON.stringify({
          fromAgentId,
          toAgentId,
          content: fallbackContent,
          timestamp: new Date().toISOString(),
        });
        const signature = await signPayload(sender.private_key, payload);
        const verified = await verifyPayload(sender.public_key, payload, signature);

        if (!verified) {
          set(state => ({
            errorByAgent: {
              ...state.errorByAgent,
              [fromAgentId]: 'Signed relay verification failed before delivery.',
            },
          }));
          return;
        }

        const relayMessage: AgentMessage = {
          id: crypto.randomUUID(),
          sender_agent_id: sender.id,
          sender_public_key: sender.public_key,
          content: fallbackContent,
          timestamp: new Date().toISOString(),
          kind: 'agent',
          signature,
          verification_status: 'verified',
        };

        const receiverWithMemory = await appendPersistentMemoryEntry(
          receiver,
          `Trusted relay from ${sender.name}: ${fallbackContent}`,
        );
        const nextMessages = clampRecentMessages([...receiverWithMemory.memory, relayMessage]);
        const nextSummary = summarizeMessages([...receiverWithMemory.memory, relayMessage], receiverWithMemory.summary);

        set(state => ({
          agents: {
            ...state.agents,
            [toAgentId]: {
              ...state.agents[toAgentId],
              ...receiverWithMemory,
              memory: nextMessages,
              summary: nextSummary,
            },
          },
          errorByAgent: {
            ...state.errorByAgent,
            [fromAgentId]: null,
          },
        }));
      },

      exportAgent: agentId => {
        const agent = get().agents[agentId];
        if (!agent) return null;

        const payload: ExportedAgent = {
          version: 'ondeck-mvp-1',
          exported_at: new Date().toISOString(),
          agent: serializeAgentForPersistence(agent),
        };

        return JSON.stringify(payload, null, 2);
      },

      importAgent: async (payload, position) => {
        try {
          const parsed = JSON.parse(payload) as ExportedAgent;
          if (parsed.version !== 'ondeck-mvp-1') {
            return { ok: false, message: 'Unsupported import version.' };
          }

          const valid = await verifyAgentSignature(parsed.agent);
          if (!valid) {
            return { ok: false, message: 'Agent signature verification failed during import.' };
          }

          const agentId = crypto.randomUUID();
          const importedAgent: AgentModel = {
            ...parsed.agent,
            id: agentId,
            memory: [],
            private_key: undefined,
            encryption_key: undefined,
            signature_verified: true,
            needs_session_rekey: true,
          };

          set(state => ({
            agents: {
              ...state.agents,
              [agentId]: importedAgent,
            },
            nodes: [...state.nodes, createNode(agentId, position)],
            selectedAgentId: agentId,
          }));

          return {
            ok: true,
            message: 'Agent imported and signature verified. Regenerate a session identity to resume signed outbound relays.',
          };
        } catch (error) {
          return {
            ok: false,
            message: error instanceof Error ? error.message : 'Import failed.',
          };
        }
      },

      refreshRuntimeState: async () => {
        const agents = get().agents;
        const updatedEntries = await Promise.all(
          Object.entries(agents).map(async ([agentId, agent]) => {
            const signature_verified = await verifyAgentSignature(agent);
            return [
              agentId,
              {
                ...agent,
                signature_verified,
                needs_session_rekey: !agent.private_key,
                encryption_key: undefined,
              },
            ] as const;
          }),
        );

        set({
          agents: Object.fromEntries(updatedEntries),
        });
      },
    }),
    {
      name: 'ondeck-local-workbench-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        agents: Object.fromEntries(
          Object.entries(state.agents).map(([agentId, agent]) => [agentId, serializeAgentForPersistence(agent)]),
        ),
        nodes: state.nodes,
        edges: state.edges,
        selectedAgentId: state.selectedAgentId,
        apiBaseUrl: state.apiBaseUrl,
        apiKey: '',
        streamingByAgent: {},
        streamingTextByAgent: {},
        errorByAgent: {},
      }),
      onRehydrateStorage: () => state => {
        state?.refreshRuntimeState().catch(() => undefined);
      },
    },
  ),
);
