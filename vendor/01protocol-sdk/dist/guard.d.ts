/**
 * Hostile-input parser guard.
 * Every imported .01ai file is treated as hostile input.
 */
export declare const LIMITS: {
    readonly MAX_BYTES: 1000000;
    readonly MAX_DEPTH: 8;
    readonly MAX_STRING_LEN: 8000;
    readonly MAX_ARRAY_LEN: 256;
    readonly MAX_KEYS: 64;
};
export type ParseGuardError = {
    code: "TOO_LARGE";
    detail: string;
} | {
    code: "INVALID_JSON";
    detail: string;
} | {
    code: "DEPTH_EXCEEDED";
    detail: string;
} | {
    code: "STRING_TOO_LONG";
    detail: string;
} | {
    code: "ARRAY_TOO_LONG";
    detail: string;
} | {
    code: "TOO_MANY_KEYS";
    detail: string;
} | {
    code: "BAD_ROOT";
    detail: string;
} | {
    code: "PROTOTYPE_POLLUTION";
    detail: string;
};
export type ParseGuardResult = {
    ok: true;
    value: Record<string, unknown>;
} | {
    ok: false;
    error: ParseGuardError;
};
export declare function parseGuarded(raw: string): ParseGuardResult;
export declare function parseGuardMessage(err: ParseGuardError): string;
//# sourceMappingURL=guard.d.ts.map