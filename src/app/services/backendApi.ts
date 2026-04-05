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
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export interface BackendSessionStatus {
  enabled: boolean;
  authenticated: boolean;
}

export interface BackendChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface BackendChatResponse {
  text: string;
  model: string;
}

export const backendApi = {
  baseUrl: API_BASE,

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
};
