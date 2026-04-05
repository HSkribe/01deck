import { hashText, generateId } from "./crypto.js";
export function createStarterMemoryVault(agent) {
    const now = new Date().toISOString();
    const vaultId = generateId("vault");
    const summary = `${agent.name}: ${agent.descriptor}`;
    const starterEntry = {
        entryId: generateId("mem"),
        vaultId,
        instanceId: agent.instanceId,
        layer: "persistent-vault",
        type: "summary",
        summary,
        fingerprint: hashText(summary),
        tags: ["starter", "identity"],
        createdAt: now,
        updatedAt: now,
    };
    return {
        vaultId,
        instanceId: agent.instanceId,
        operationalCache: [],
        persistentEntries: [starterEntry],
        verifiedEntries: [],
        memoryStats: { totalEntries: 1, verifiedEntries: 0, verifiedMemoryUnits: 0, dedupeCount: 0 },
        embeddingIndexKeys: [],
        createdAt: now,
        updatedAt: now,
    };
}
export function addMemoryEntry(vault, entry) {
    const now = new Date().toISOString();
    const newEntry = {
        ...entry,
        entryId: generateId("mem"),
        vaultId: vault.vaultId,
        fingerprint: hashText(entry.summary),
        createdAt: now,
        updatedAt: now,
    };
    const isVerified = entry.layer === "persistent-vault";
    return {
        ...vault,
        persistentEntries: isVerified ? [...vault.persistentEntries, newEntry] : vault.persistentEntries,
        operationalCache: !isVerified ? [...vault.operationalCache, newEntry] : vault.operationalCache,
        memoryStats: {
            ...vault.memoryStats,
            totalEntries: vault.memoryStats.totalEntries + 1,
        },
        updatedAt: now,
    };
}
export function computeVaultMerkleRoot(vault) {
    const hashable = {
        persistentEntries: [...vault.persistentEntries].sort((a, b) => a.entryId.localeCompare(b.entryId)),
        verifiedEntries: [...vault.verifiedEntries].sort((a, b) => a.entryId.localeCompare(b.entryId)),
    };
    return hashText(JSON.stringify(hashable));
}
export function createPortableBundle(identity, memoryVault) {
    return {
        bundleVersion: "0.1.0",
        bundleId: generateId("bundle"),
        createdAt: new Date().toISOString(),
        identity,
        memoryVault,
    };
}
//# sourceMappingURL=memory.js.map