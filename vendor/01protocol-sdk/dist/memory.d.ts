import type { AgentId, AgentMemoryVault, MemoryEntry, PortableBundle } from "./types.js";
export declare function createStarterMemoryVault(agent: AgentId): AgentMemoryVault;
export declare function addMemoryEntry(vault: AgentMemoryVault, entry: Omit<MemoryEntry, "entryId" | "vaultId" | "fingerprint" | "createdAt" | "updatedAt">): AgentMemoryVault;
export declare function computeVaultMerkleRoot(vault: AgentMemoryVault): string;
export declare function createPortableBundle(identity: AgentId, memoryVault: AgentMemoryVault): PortableBundle;
//# sourceMappingURL=memory.d.ts.map