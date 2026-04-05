import type { AgentId } from "./types.js";
export interface DelegationScope {
    /** Actions the delegate is permitted to perform, e.g. ["read:lab_results", "write:appointments"] */
    actions: string[];
    /** Optional resource constraints, e.g. { patientId: "p-123" } */
    resources?: Record<string, string>;
}
export interface DelegationToken {
    tokenId: string;
    delegatorInstanceId: string;
    delegatorPublicKey: string;
    delegateInstanceId: string;
    scope: DelegationScope;
    issuedAt: string;
    expiresAt: string;
    /** Ed25519 signature by the delegator over the canonical token payload */
    signature: string;
}
export interface DelegationVerifyResult {
    valid: boolean;
    error?: string;
    warnings: string[];
    token?: DelegationToken;
}
/**
 * Create a delegation token granting Agent B permission to act within a scope.
 * Must be called by Agent A using A's private key.
 */
export declare function createDelegationToken(params: {
    delegator: AgentId;
    delegatorPrivateKeyHex: string;
    delegateInstanceId: string;
    scope: DelegationScope;
    /** ISO 8601 expiry — e.g. new Date(Date.now() + 3600_000).toISOString() */
    expiresAt: string;
}): DelegationToken;
/**
 * Verify a delegation token.
 * Checks: signature valid, not expired, delegator identity matches, delegate identity matches.
 */
export declare function verifyDelegationToken(params: {
    token: DelegationToken;
    delegator: AgentId;
    delegate: AgentId;
    /** Action being attempted — checked against token scope */
    action: string;
}): DelegationVerifyResult;
/**
 * Serialize a delegation token to JSON for transmission.
 */
export declare function serializeDelegationToken(token: DelegationToken): string;
/**
 * Parse and lightly validate a delegation token from JSON text.
 * Does not verify cryptographic signatures — call verifyDelegationToken for that.
 */
export declare function parseDelegationToken(text: string): DelegationToken;
//# sourceMappingURL=delegation.d.ts.map