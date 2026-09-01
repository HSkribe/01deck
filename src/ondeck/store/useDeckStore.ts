import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from '@xyflow/react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AGENT_TEMPLATES } from '../templates';
import {
  decryptText,
  deriveAesKeyFromPassphrase,
  encryptText,
  generateAesKey,
  sha256Hex,
} from '../lib/crypto';
import {
  bindAgentToOwner,
  enrollIdentity,
  enrollOwnerIdentity,
  evolveIdentity,
  signAsAgent,
  verifyIdentity,
  verifyOwnerBinding,
} from '../lib/protocol';
import { streamChatCompletion } from '../lib/llm';
import { executeTool } from '../lib/tools';
import type {
  AgentEdge,
  AgentMessage,
  AgentModel,
  AgentNode,
  AgentTemplate,
  ExportedAgent,
  MemoryEntry,
  OwnerIdentityState,
  ToolName,
} from '../types';

type DeckState = {
  agents: Record<string, AgentModel>;
  nodes: AgentNode[];
  edges: AgentEdge[];
  selectedAgentId: string | null;
  apiBaseUrl: string;
  apiKey: string;
  owner: OwnerIdentityState | null;
  streamingByAgent: Record<string, boolean>;
  streamingTextByAgent: Record<string, string>;
  errorByAgent: Record<string, string | null>;
  workbenchError: string | null;
  selectAgent: (agentId: string | null) => void;
  setApiBaseUrl: (value: string) => void;
  setApiKey: (value: string) => void;
  ensureOwnerIdentity: (displayName?: string) => Promise<OwnerIdentityState>;
  createAgentFromTemplate: (
    templateId: string,
    position: { x: number; y: number },
  ) => Promise<{ ok: boolean; message?: string }>;
  deleteAgent: (agentId: string) => void;
  onNodesChange: (changes: NodeChange<AgentNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AgentEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  updateAgentConfig: (
    agentId: string,
    patch: Partial<Pick<AgentModel, 'name' | 'system_prompt' | 'model' | 'temperature'>>,
  ) => Promise<void>;
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

// Persisted to localStorage as-is, private key included: 01Protocol identity
// is meant to be stable across sessions (that's the whole point of a portable
// instanceId), so unlike the old local-only keypair scheme, the key has to
// survive reload for the owner-delegation chain to stay meaningful. This is a
// real security tradeoff over the old "never touches disk" stance — see the
// note in this repo's dev skill / project notes for the passphrase-vault
// hardening this should get before shipping beyond a local prototype.
function serializeAgentForPersistence(agent: AgentModel): AgentModel {
  return {
    ...agent,
    memory: [],
  };
}

// Portable export DOES strip the private key — an exported agent file is
// meant to be shareable (or at least survivable if it ends up somewhere
// unintended), so it only ever carries public identity + config.
function serializeAgentForExport(agent: AgentModel): ExportedAgent['agent'] {
  return {
    ...agent,
    private_key_hex: undefined,
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
    'Identity (01Protocol):',
    `- instance id: ${agent.identity.instanceId}`,
    `- public key: ${agent.public_key.slice(0, 18)}...`,
    `- integrity checksum: ${agent.identity.integrityChecksum}`,
    `- signature verified: ${agent.signature_verified ? 'yes' : 'no'}`,
    `- owner-bound: ${agent.owner_delegation ? 'yes' : 'no'}`,
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

// Every agent's identity, and its binding to the owner, comes from 01Protocol
// — never a locally-generated keypair. An agent that can't be enrolled and
// delegated is not created at all; see lib/protocol.ts.
function makeAgent(
  template: AgentTemplate,
  owner: OwnerIdentityState,
  position: { x: number; y: number },
): { agent: AgentModel; node: AgentNode } {
  if (!owner.private_key_hex) {
    throw new Error('Owner identity has no private key available in this session — cannot bind a new agent to it.');
  }

  const enrolled = enrollIdentity({
    name: template.name,
    role: 'agent',
    goal: `${template.system_prompt.slice(0, 160)} | 01deck-platform`,
    includeMemory: true,
    memoryMode: 'always_on',
  });

  const owner_delegation = bindAgentToOwner({
    owner: owner.identity,
    ownerPrivateKeyHex: owner.private_key_hex,
    agent: enrolled.agent,
  });

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
    identity: enrolled.agent,
    private_key_hex: enrolled.privateKeyHex,
    public_key: enrolled.agent.signerPublicKey,
    signature_verified: true,
    needs_private_key: false,
    owner_delegation,
    trusted_agents: [],
    allowed_tools: [...template.allowed_tools],
    encryption_enabled: false,
  };

  return {
    agent,
    node: createNode(agentId, position),
  };
}

function resignWithCurrentConfig(agent: AgentModel) {
  if (!agent.private_key_hex) {
    throw new Error('This agent has no private key available in this session and cannot be resigned.');
  }

  return evolveIdentity(agent.identity, agent.private_key_hex, {
    name: agent.name,
    platformProfiles: [
      {
        platform: '01deck',
        model: agent.model,
        temperature: agent.temperature,
        systemPromptOverride: agent.system_prompt,
      },
    ],
  });
}

const initialState = {
  agents: {},
  nodes: [],
  edges: [],
  selectedAgentId: null,
  apiBaseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  owner: null,
  streamingByAgent: {},
  streamingTextByAgent: {},
  errorByAgent: {},
  workbenchError: null,
};

export const useDeckStore = create<DeckState>()(
  persist(
    (set, get) => ({
      ...initialState,

      selectAgent: agentId => set({ selectedAgentId: agentId }),
      setApiBaseUrl: value => set({ apiBaseUrl: value }),
      setApiKey: value => set({ apiKey: value }),

      ensureOwnerIdentity: async displayName => {
        const existing = get().owner;
        if (existing) return existing;

        const enrolled = enrollOwnerIdentity(displayName?.trim() || 'Owner');
        const owner: OwnerIdentityState = {
          identity: enrolled.agent,
          private_key_hex: enrolled.privateKeyHex,
        };

        set({ owner });
        return owner;
      },

      createAgentFromTemplate: async (templateId, position) => {
        const template = AGENT_TEMPLATES.find(item => item.id === templateId) ?? AGENT_TEMPLATES[0];

        try {
          const owner = await get().ensureOwnerIdentity();
          const { agent, node } = makeAgent(template, owner, position);

          set(state => ({
            agents: { ...state.agents, [agent.id]: agent },
            nodes: [...state.nodes, node],
            selectedAgentId: agent.id,
            workbenchError: null,
          }));
          return { ok: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Could not enroll this agent in 01Protocol.';
          set({ workbenchError: message });
          return { ok: false, message };
        }
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

        if (!merged.private_key_hex) {
          set(state => ({
            agents: {
              ...state.agents,
              [agentId]: { ...merged, signature_verified: false, needs_private_key: true },
            },
          }));
          return;
        }

        const identity = resignWithCurrentConfig(merged);

        set(state => ({
          agents: {
            ...state.agents,
            [agentId]: {
              ...merged,
              identity,
              public_key: identity.signerPublicKey,
              signature_verified: true,
              needs_private_key: false,
            },
          },
        }));
      },

      regenerateAgentIdentity: async agentId => {
        const agent = get().agents[agentId];
        if (!agent || !agent.private_key_hex) return;

        const identity = resignWithCurrentConfig(agent);

        set(state => ({
          agents: {
            ...state.agents,
            [agentId]: {
              ...agent,
              identity,
              public_key: identity.signerPublicKey,
              signature_verified: true,
              needs_private_key: false,
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

        if (!sender.private_key_hex) {
          set(state => ({
            errorByAgent: {
              ...state.errorByAgent,
              [fromAgentId]: 'This agent has no private key available in this session and cannot sign relayed messages.',
            },
          }));
          return;
        }

        const fallbackContent =
          content?.trim() ||
          sender.memory.filter(message => message.kind === 'assistant' || message.kind === 'tool').at(-1)?.content ||
          'No recent assistant output was available to relay.';

        const signed = signAsAgent(fallbackContent, sender.identity, sender.private_key_hex);

        // The SDK doesn't publicly export a generic verify-arbitrary-signature
        // function (only whole-identity-record verification) — see the header
        // comment in lib/protocol.ts. We confirm the sender's identity record
        // is itself currently valid and that the signed output claims the
        // sender's current public key, rather than re-deriving Ed25519
        // verification by hand outside the SDK's supported surface.
        const senderIdentityCheck = verifyIdentity(sender.identity);
        const verified = senderIdentityCheck.valid && signed.signerPublicKey === sender.identity.signerPublicKey;

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
          timestamp: signed.signedAt,
          kind: 'agent',
          signature: signed.signature,
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
          version: 'ondeck-01protocol-1',
          exported_at: new Date().toISOString(),
          agent: serializeAgentForExport(agent),
        };

        return JSON.stringify(payload, null, 2);
      },

      importAgent: async (payload, position) => {
        try {
          const parsed = JSON.parse(payload) as ExportedAgent;
          if (parsed.version !== 'ondeck-01protocol-1') {
            return { ok: false, message: 'Unsupported import version.' };
          }

          const identityCheck = verifyIdentity(parsed.agent.identity);
          if (!identityCheck.valid) {
            return { ok: false, message: `Agent identity verification failed during import: ${identityCheck.error}` };
          }

          const owner = get().owner;
          const bindingCheck = owner
            ? verifyOwnerBinding({ token: parsed.agent.owner_delegation, owner: owner.identity, agent: parsed.agent.identity })
            : null;

          const agentId = crypto.randomUUID();
          const importedAgent: AgentModel = {
            ...parsed.agent,
            id: agentId,
            memory: [],
            private_key_hex: undefined,
            encryption_key: undefined,
            signature_verified: identityCheck.valid,
            needs_private_key: true,
          };

          set(state => ({
            agents: {
              ...state.agents,
              [agentId]: importedAgent,
            },
            nodes: [...state.nodes, createNode(agentId, position)],
            selectedAgentId: agentId,
          }));

          const bindingNote = owner
            ? bindingCheck?.valid
              ? " Its owner delegation matches this installation's owner identity."
              : " Its owner delegation does NOT match this installation's owner identity — it is bound to a different owner."
            : '';

          return {
            ok: true,
            message: `Agent imported and identity verified.${bindingNote} It has no private key here, so it can be viewed and trusted but not resigned or used to sign relays.`,
          };
        } catch (error) {
          return {
            ok: false,
            message: error instanceof Error ? error.message : 'Import failed.',
          };
        }
      },

      refreshRuntimeState: async () => {
        const { agents, owner } = get();
        const ownerCheck = owner ? verifyIdentity(owner.identity) : null;

        const updatedEntries = Object.entries(agents).map(([agentId, agent]) => {
          const identityCheck = verifyIdentity(agent.identity);
          const bindingCheck =
            owner && ownerCheck?.valid
              ? verifyOwnerBinding({ token: agent.owner_delegation, owner: owner.identity, agent: agent.identity })
              : null;

          return [
            agentId,
            {
              ...agent,
              signature_verified: identityCheck.valid && (bindingCheck?.valid ?? false),
              needs_private_key: !agent.private_key_hex,
              encryption_key: undefined,
            },
          ] as const;
        });

        set({ agents: Object.fromEntries(updatedEntries) });
      },
    }),
    {
      name: 'ondeck-local-workbench-v3',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        agents: Object.fromEntries(
          Object.entries(state.agents).map(([agentId, agent]) => [agentId, serializeAgentForPersistence(agent)]),
        ),
        nodes: state.nodes,
        edges: state.edges,
        selectedAgentId: state.selectedAgentId,
        apiBaseUrl: state.apiBaseUrl,
        owner: state.owner,
        apiKey: '',
        streamingByAgent: {},
        streamingTextByAgent: {},
        errorByAgent: {},
        workbenchError: null,
      }),
      onRehydrateStorage: () => state => {
        state?.refreshRuntimeState().catch(() => undefined);
      },
    },
  ),
);
