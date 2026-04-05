import type { AgentId, AgentMemoryVault, MemoryEntry } from "./types.js";
export type ConsentDecision = "PERMIT" | "DENY" | "ESCALATE";
export interface ConsentPolicy {
    /** Memory entry types/tags that are always allowed */
    permit: string[];
    /** Memory entry types/tags that are always blocked */
    deny: string[];
    /** Memory entry types/tags that require explicit user confirmation */
    escalate: string[];
}
export interface ConsentAuditEntry {
    auditId: string;
    instanceId: string;
    decision: ConsentDecision;
    entryType: string;
    entryTags: string[];
    matchedRule: string;
    timestamp: string;
}
export interface GuardedWriteResult {
    decision: ConsentDecision;
    vault?: AgentMemoryVault;
    auditEntry: ConsentAuditEntry;
    /** Only present when decision is ESCALATE — call this with user's answer */
    escalationPrompt?: string;
}
/**
 * Evaluate a consent decision for a proposed memory entry.
 * Checks entry type first, then tags. Deny takes priority over escalate.
 */
export declare function evaluateConsentPolicy(policy: ConsentPolicy, entryType: string, entryTags: string[]): {
    decision: ConsentDecision;
    matchedRule: string;
};
/**
 * Attempt to write a memory entry, gated by the agent's consent policy.
 *
 * - PERMIT: writes to vault, returns updated vault
 * - DENY: drops entry, returns original vault with audit log
 * - ESCALATE: returns escalationPrompt — call confirmEscalation() with user's answer
 *
 * The audit trail is always returned regardless of decision.
 */
export declare function guardedAddMemoryEntry(vault: AgentMemoryVault, policy: ConsentPolicy, entry: Omit<MemoryEntry, "entryId" | "vaultId" | "fingerprint" | "createdAt" | "updatedAt">): GuardedWriteResult;
/**
 * After an ESCALATE, call this with the user's response.
 * If allowed, writes the entry. If denied, drops it.
 * Either way, the user's decision is recorded as a signed audit entry in the vault.
 */
export declare function confirmEscalation(vault: AgentMemoryVault, pendingEntry: Omit<MemoryEntry, "entryId" | "vaultId" | "fingerprint" | "createdAt" | "updatedAt">, userAllowed: boolean): {
    vault: AgentMemoryVault;
    decision: "PERMIT" | "DENY";
};
/**
 * Extract the consent policy embedded in an agent's identity record.
 * Returns null if no policy is set.
 */
export declare function getAgentConsentPolicy(agent: AgentId): ConsentPolicy | null;
//# sourceMappingURL=consent.d.ts.map