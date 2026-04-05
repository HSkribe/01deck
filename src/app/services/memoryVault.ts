import type { Agent } from '../data/agents';

type MemoryRole = 'user' | 'agent';

type MemoryEntry = {
  role: MemoryRole;
  content: string;
  timestamp: string;
};

type MemoryVaultRecord = {
  agentId: string;
  agentName: string;
  vaultId: string;
  createdAt: string;
  updatedAt: string;
  entries: MemoryEntry[];
};

const STORAGE_KEY = '01deck.memory-vaults';
const MAX_ENTRIES = 24;

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function getVaultId(agent: Agent): string {
  return agent.memoryVaultId || `vault-${agent.id}`;
}

function readVaults(): Record<string, MemoryVaultRecord> {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, MemoryVaultRecord>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeVaults(vaults: Record<string, MemoryVaultRecord>): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vaults));
}

function summarizeEntries(entries: MemoryEntry[]): string {
  if (entries.length === 0) {
    return 'No persistent memory yet.';
  }

  return entries
    .slice(-6)
    .map(entry => `${entry.role === 'user' ? 'User' : 'Agent'}: ${entry.content.trim()}`)
    .join(' | ');
}

export async function ensureAgentMemoryVault(agent: Agent): Promise<MemoryVaultRecord> {
  const vaults = readVaults();
  const now = new Date().toISOString();
  const existing = vaults[agent.id];

  if (existing) {
    return existing;
  }

  const created: MemoryVaultRecord = {
    agentId: agent.id,
    agentName: agent.name,
    vaultId: getVaultId(agent),
    createdAt: now,
    updatedAt: now,
    entries: [],
  };

  vaults[agent.id] = created;
  writeVaults(vaults);
  return created;
}

export async function appendConversationMemory(
  agent: Agent,
  entries: Array<{ role: MemoryRole; content: string }>,
): Promise<MemoryVaultRecord> {
  const vaults = readVaults();
  const current = await ensureAgentMemoryVault(agent);
  const nextEntries = entries
    .map(entry => ({
      role: entry.role,
      content: entry.content.trim(),
      timestamp: new Date().toISOString(),
    }))
    .filter(entry => entry.content.length > 0);

  const updated: MemoryVaultRecord = {
    ...current,
    agentName: agent.name,
    vaultId: getVaultId(agent),
    updatedAt: new Date().toISOString(),
    entries: [...current.entries, ...nextEntries].slice(-MAX_ENTRIES),
  };

  vaults[agent.id] = updated;
  writeVaults(vaults);
  return updated;
}

export async function getAgentMemoryContext(agentId: string): Promise<string> {
  const vault = readVaults()[agentId];
  if (!vault) return 'No persistent memory yet.';
  return summarizeEntries(vault.entries);
}
