import type { AgentId, CreateAgentParams, CreateAgentResult } from "./types.js";
export declare function createAgent(params: CreateAgentParams): CreateAgentResult;
export declare function resignAgent(agent: AgentId, privateKeyHex: string, updates?: Partial<AgentId>): AgentId;
export declare function signOutput(content: string, agent: AgentId, privateKeyHex: string): {
    content: string;
    agentId: string;
    agentName: string;
    signerPublicKey: string;
    signature: string;
    signedAt: string;
};
export declare function serializeAgent(agent: AgentId): string;
//# sourceMappingURL=agent.d.ts.map