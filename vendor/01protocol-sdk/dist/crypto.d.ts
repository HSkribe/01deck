import { bytesToHex, hexToBytes } from "@noble/curves/abstract/utils";
import type { AgentId } from "./types.js";
export { bytesToHex, hexToBytes };
/**
 * Cross-platform random bytes — works in Node.js 19+, browsers, and Deno.
 */
export declare function randomBytes(n: number): Uint8Array;
export declare function hashText(text: string): string;
/**
 * Canonical signed digest — identical across all runtimes.
 * Field order is spec-defined and must not change.
 */
export declare function computeSignedDigest(agent: AgentId): Uint8Array;
export declare function generateKeypair(): {
    privateKeyHex: string;
    publicKeyHex: string;
};
export declare function signDigest(digest: Uint8Array, privateKeyHex: string): string;
export declare function verifySignature(digest: Uint8Array, signatureHex: string, publicKeyHex: string): boolean;
export declare function generateId(prefix: string): string;
export declare function generateInstanceId(): string;
//# sourceMappingURL=crypto.d.ts.map