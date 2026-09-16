const API_BASE = (import.meta.env.VITE_01EVOLVE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://127.0.0.1:8000';

type BackendFetchOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
};

async function backendFetch<T>(path: string, options: BackendFetchOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const raw = await response.text();
    // FastAPI's HTTPException bodies are JSON ({"detail": "..."}) — surface
    // the human-readable detail instead of the raw '{"detail":"..."}' string.
    let message = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.detail === 'string') message = parsed.detail;
    } catch {
      // not JSON — fall through and use the raw text as-is
    }
    throw new Error(message || `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export interface BackendSessionStatus {
  enabled: boolean;
  authenticated: boolean;
}

/**
 * A network-level failure (backend not running, DNS/CORS failure, offline)
 * vs. an HTTP-level failure (backend is up but returned an error). Callers
 * use this to tell "backend unreachable" apart from "backend reachable but
 * something's wrong with this request" — see AppContext's syncBackendSession.
 */
export class BackendUnreachableError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : 'Backend unreachable');
    this.name = 'BackendUnreachableError';
  }
}

export interface BackendChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface BackendChatResponse {
  text: string;
  model: string;
}

export interface BackendAccount {
  account_id: string;
  username: string;
  display_name: string;
  xp: number;
  level: number;
  created_at: string;
  last_login_at: string | null;
}

export const backendApi = {
  baseUrl: API_BASE,

  /**
   * Hits /healthz to answer one question: is the backend process reachable
   * at all? Resolves true/false for an actual HTTP response (even a 5xx —
   * that still means something is listening); throws BackendUnreachableError
   * only when the request itself couldn't be made (network/DNS/CORS/offline
   * — i.e. nothing is listening at API_BASE). Callers use this to show
   * "backend unreachable" instead of misreporting a down backend as
   * "sign-in required".
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/healthz`, { method: 'GET' });
      return response.ok;
    } catch (error) {
      throw new BackendUnreachableError(error);
    }
  },

  getSessionStatus(): Promise<BackendSessionStatus> {
    return backendFetch<BackendSessionStatus>('/auth/session');
  },

  createSession(token: string): Promise<BackendSessionStatus> {
    return backendFetch<BackendSessionStatus>('/auth/session', {
      method: 'POST',
      body: { token },
    });
  },

  clearSession(): Promise<{ authenticated: boolean }> {
    return backendFetch<{ authenticated: boolean }>('/auth/session', {
      method: 'DELETE',
    });
  },

  chatCompletion(payload: {
    model: string;
    temperature: number;
    max_tokens?: number;
    messages: BackendChatMessage[];
  }): Promise<BackendChatResponse> {
    return backendFetch<BackendChatResponse>('/chat/completions', {
      method: 'POST',
      body: payload,
    });
  },

  getJson<T>(path: string): Promise<T> {
    return backendFetch<T>(path);
  },

  signupAccount(payload: { username: string; displayName: string; password: string; email?: string }): Promise<BackendAccount> {
    return backendFetch<{ account: BackendAccount }>('/account/signup', {
      method: 'POST',
      body: {
        username: payload.username,
        display_name: payload.displayName,
        password: payload.password,
        email: payload.email,
      },
    }).then(res => res.account);
  },

  loginAccount(username: string, password: string): Promise<BackendAccount> {
    return backendFetch<{ account: BackendAccount }>('/account/login', {
      method: 'POST',
      body: { username, password },
    }).then(res => res.account);
  },

  logoutAccount(): Promise<void> {
    return backendFetch<{ authenticated: boolean }>('/account/session', { method: 'DELETE' }).then(() => undefined);
  },

  getAccount(): Promise<BackendAccount> {
    return backendFetch<{ account: BackendAccount }>('/account/me').then(res => res.account);
  },

  awardAccountXp(amount: number): Promise<BackendAccount> {
    return backendFetch<{ account: BackendAccount }>('/account/xp', {
      method: 'POST',
      body: { amount },
    }).then(res => res.account);
  },
};
