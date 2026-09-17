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

// ─── Social Layer Types ───────────────────────────────────────────────────────
// Field names match the Pydantic schemas in 01Evolve/app/core/schemas/models.py
// exactly — do not rename without updating that file.

/** Minimal public identity used in the online roster and message/forum author fields. */
export interface AccountPresence {
  account_id: string;
  username: string;
  display_name: string;
  is_system_account: boolean;
}

/** A single message in a global chat channel, with sender info already resolved. */
export interface SocialGlobalChatMessage {
  message_id: number;
  channel: string;
  sender: AccountPresence;
  content: string;
  created_at: string; // ISO 8601
}

/** An account's view of one of its 1:1 conversations. */
export interface SocialDirectConversation {
  conversation_id: string;
  other_participant: AccountPresence;
  last_message_at: string; // ISO 8601
  last_message_preview: string | null;
}

/** A single message inside a direct conversation. */
export interface SocialDirectMessage {
  message_id: number;
  conversation_id: string;
  sender: AccountPresence;
  content: string;
  created_at: string; // ISO 8601
}

/** A forum thread with author info and reply count resolved. */
export interface SocialForumThread {
  thread_id: string;
  author: AccountPresence;
  title: string;
  body: string;
  tags: string[];
  reply_count: number;
  created_at: string; // ISO 8601
}

/** A reply to a forum thread, with author info resolved. */
export interface SocialForumReply {
  reply_id: string;
  thread_id: string;
  author: AccountPresence;
  content: string;
  created_at: string; // ISO 8601
}

/** Bosun's reply to a single /bosun/chat turn. There is no history endpoint —
 * only this deployment's own tiered memory persists across turns server-side;
 * the visible transcript is session-local (see BosunChatModal). */
export interface BosunChatReply {
  text: string;
  model: string;
  remembered_about_me: boolean;
  proposed_for_everyone: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────

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

  // ─── Social: Presence ──────────────────────────────────────────────────────

  /** Mark the signed-in backend account as online. 401 if not signed in. */
  heartbeat(): Promise<{ ok: boolean }> {
    return backendFetch<{ ok: boolean }>('/presence/heartbeat', { method: 'POST' });
  },

  /** Fetch all accounts active in the last 2 minutes. No auth required. */
  getOnlinePresence(): Promise<{ online: AccountPresence[] }> {
    return backendFetch<{ online: AccountPresence[] }>('/presence/online');
  },

  // ─── Social: Global Chat ───────────────────────────────────────────────────

  /**
   * Fetch messages in a global channel, oldest-first.
   * afterId: only return messages with message_id > afterId (poll cursor).
   */
  getGlobalChatMessages(
    channel: string,
    afterId?: number,
    limit = 100,
  ): Promise<{ messages: SocialGlobalChatMessage[] }> {
    const params = new URLSearchParams({ channel, limit: String(limit) });
    if (afterId != null) params.set('after_id', String(afterId));
    return backendFetch<{ messages: SocialGlobalChatMessage[] }>(`/chat/global?${params.toString()}`);
  },

  /** Post a message to a global channel. Account-gated. */
  postGlobalChatMessage(
    channel: string,
    content: string,
  ): Promise<{ message: SocialGlobalChatMessage }> {
    return backendFetch<{ message: SocialGlobalChatMessage }>('/chat/global', {
      method: 'POST',
      body: { channel, content },
    });
  },

  // ─── Social: Direct Messages ───────────────────────────────────────────────

  /** Find or create the 1:1 conversation with another account. Account-gated. */
  startConversation(otherAccountId: string): Promise<{ conversation_id: string }> {
    return backendFetch<{ conversation_id: string }>('/messages/start', {
      method: 'POST',
      body: { other_account_id: otherAccountId },
    });
  },

  /** List the signed-in account's conversations, most-recently-active first. Account-gated. */
  getConversations(): Promise<{ conversations: SocialDirectConversation[] }> {
    return backendFetch<{ conversations: SocialDirectConversation[] }>('/messages/conversations');
  },

  /**
   * Fetch messages in a conversation. Account-gated, 403 if not a participant.
   * afterId: cursor for incremental polling.
   */
  getDirectMessages(
    conversationId: string,
    afterId?: number,
    limit = 100,
  ): Promise<{ messages: SocialDirectMessage[] }> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (afterId != null) params.set('after_id', String(afterId));
    const query = params.toString();
    return backendFetch<{ messages: SocialDirectMessage[] }>(
      `/messages/${conversationId}${query ? `?${query}` : ''}`,
    );
  },

  /** Send a message to an existing conversation. 403 if not a participant. */
  sendDirectMessage(
    conversationId: string,
    content: string,
  ): Promise<{ message: SocialDirectMessage }> {
    return backendFetch<{ message: SocialDirectMessage }>(`/messages/${conversationId}/send`, {
      method: 'POST',
      body: { content },
    });
  },

  // ─── Social: Forum ─────────────────────────────────────────────────────────

  /**
   * List forum threads newest-first with author info and reply count. No auth required.
   * beforeId: cursor for pagination (thread_id of the oldest thread already loaded).
   */
  getForumThreads(
    beforeId?: string,
    limit = 20,
  ): Promise<{ threads: SocialForumThread[] }> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (beforeId) params.set('before_id', beforeId);
    return backendFetch<{ threads: SocialForumThread[] }>(`/forum/threads?${params.toString()}`);
  },

  /** Fetch a thread and all its replies, oldest-first. No auth required. */
  getForumThread(
    threadId: string,
  ): Promise<{ thread: SocialForumThread; replies: SocialForumReply[] }> {
    return backendFetch<{ thread: SocialForumThread; replies: SocialForumReply[] }>(
      `/forum/threads/${threadId}`,
    );
  },

  /** Create a new forum thread. Account-gated. */
  createForumThread(
    title: string,
    body: string,
    tags: string[] = [],
  ): Promise<{ thread: SocialForumThread }> {
    return backendFetch<{ thread: SocialForumThread }>('/forum/threads', {
      method: 'POST',
      body: { title, body, tags },
    });
  },

  /** Post a reply to a forum thread. Account-gated, 404 if thread doesn't exist. */
  createForumReply(
    threadId: string,
    content: string,
  ): Promise<{ reply: SocialForumReply }> {
    return backendFetch<{ reply: SocialForumReply }>(`/forum/threads/${threadId}/replies`, {
      method: 'POST',
      body: { content },
    });
  },

  // ─── Bosun ─────────────────────────────────────────────────────────────────

  /**
   * Send one message to Bosun and get his reply. Account-gated (401 if not
   * signed in), rate-limited server-side (per-account and aggregate, since
   * he runs on one shared LLM key). remember flags are opt-in per turn —
   * nothing is remembered just from asking a question.
   */
  bosunChat(
    message: string,
    opts: { rememberAboutMe?: boolean; rememberForEveryone?: boolean } = {},
  ): Promise<BosunChatReply> {
    return backendFetch<BosunChatReply>('/bosun/chat', {
      method: 'POST',
      body: {
        message,
        remember_about_me: opts.rememberAboutMe ?? false,
        remember_for_everyone: opts.rememberForEveryone ?? false,
      },
    });
  },
};
