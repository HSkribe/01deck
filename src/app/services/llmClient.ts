import { ensureApiKeysLoaded, getStoredApiKeysSync, type ApiKeyRecord } from '../utils/secureApiKeyStore';

// The single source of truth for which providers this app can actually call.
// ProfileHub.tsx's key-management UI imports this type rather than declaring
// its own — the two used to be separate, hand-maintained unions ('grok' and
// 'mistral' were only ever in ProfileHub's) so a key saved for either
// provider was silently never picked up here. Add a provider in exactly one
// place: this union, plus its branch in generateAgentCompletion() below.
export type ProviderId = 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'groq' | 'deepseek' | 'grok' | 'mistral';

export type StoredApiKeyRecord = ApiKeyRecord;
export type StoredApiKeys = Partial<Record<ProviderId, StoredApiKeyRecord>>;

// Keys are encrypted at rest — see src/app/utils/secureApiKeyStore.ts. This
// function stays synchronous (existing callers, including render-time reads
// in AppContext, depend on that) by reading an in-memory cache that the
// store keeps warm from module load; ensureApiKeysLoaded()/
// getStoredApiKeysAsync() are available where callers can await the initial
// decrypt instead of relying on the cache already being populated.
export function getStoredApiKeys(): StoredApiKeys {
  return getStoredApiKeysSync<ProviderId>();
}

export { ensureApiKeysLoaded };

export function getActiveApiKey(): { provider: ProviderId; key: string } | null {
  const keys = getStoredApiKeys();
  // OpenRouter first: it's the recommended onboarding path (openrouter/free
  // below needs no payment method), so if a visitor followed that path and
  // also still has some other provider's key sitting around, the one they
  // just deliberately set up is what actually gets used.
  const priorityOrder: ProviderId[] = ['openrouter', 'gemini', 'openai', 'anthropic', 'groq', 'deepseek', 'grok', 'mistral'];
  for (const provider of priorityOrder) {
    const record = keys[provider];
    if (record && record.key && record.key.trim().length > 0) {
      return { provider, key: record.key.trim() };
    }
  }
  return null;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionOptions {
  messages: LLMMessage[];
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  provider?: ProviderId;
  apiKey?: string;
}

export async function generateAgentCompletion(options: LLMCompletionOptions): Promise<string> {
  const activeKeyInfo = getActiveApiKey();
  const provider = options.provider || activeKeyInfo?.provider;
  const apiKey = options.apiKey || (provider ? getStoredApiKeys()[provider]?.key : undefined);

  if (!provider || !apiKey) {
    throw new Error('No API key configured for live agent responses.');
  }

  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 1024;
  const systemPrompt = options.systemPrompt || '';

  if (provider === 'gemini') {
    const model = options.model || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const contents = options.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const body: Record<string, unknown> = { contents };
    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }
    body.generationConfig = { temperature, maxOutputTokens: maxTokens };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const reply = candidate?.content?.parts?.[0]?.text;
    if (!reply) {
      throw new Error('Gemini API returned an empty response.');
    }
    return reply;
  }

  if (
    provider === 'openai' ||
    provider === 'openrouter' ||
    provider === 'groq' ||
    provider === 'deepseek' ||
    provider === 'grok' ||
    provider === 'mistral'
  ) {
    let baseUrl = 'https://api.openai.com/v1';
    let defaultModel = 'gpt-4o-mini';

    if (provider === 'openrouter') {
      baseUrl = 'https://openrouter.ai/api/v1';
      // OpenRouter's own auto-router across whatever's currently free — see
      // https://openrouter.ai/openrouter/free. Picking a specific free model
      // here would go stale (OpenRouter's free roster rotates constantly as
      // providers add/pull/reprice models); this alias is the part of the
      // catalog OpenRouter itself keeps pointed at something free. Needs no
      // payment method on the account at all — this is the "recommend
      // OpenRouter + a free model" onboarding path in ProfileHub.tsx.
      defaultModel = 'openrouter/free';
    } else if (provider === 'groq') {
      baseUrl = 'https://api.groq.com/openai/v1';
      defaultModel = 'llama-3.3-70b-versatile';
    } else if (provider === 'deepseek') {
      baseUrl = 'https://api.deepseek.com/v1';
      defaultModel = 'deepseek-chat';
    } else if (provider === 'grok') {
      baseUrl = 'https://api.x.ai/v1';
      defaultModel = 'grok-4.6';
    } else if (provider === 'mistral') {
      baseUrl = 'https://api.mistral.ai/v1';
      // "-latest" is a Mistral-maintained alias, not a dated snapshot — it
      // keeps pointing at their current small/cheap model without needing
      // an update here when a new one ships.
      defaultModel = 'mistral-small-latest';
    }

    const model = options.model || defaultModel;
    const formattedMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...options.messages.filter(m => m.role !== 'system')]
      : options.messages;

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`${provider} API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) {
      throw new Error(`${provider} API returned an empty response.`);
    }
    return reply;
  }

  if (provider === 'anthropic') {
    const model = options.model || 'claude-3-5-sonnet-20241022';
    const formattedMessages = options.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true',
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages: formattedMessages,
        max_tokens: maxTokens,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const reply = data.content?.[0]?.text;
    if (!reply) {
      throw new Error('Anthropic API returned an empty response.');
    }
    return reply;
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
}
