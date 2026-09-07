// Encrypted-at-rest storage for user-supplied LLM provider API keys.
//
// Previously these were written to localStorage as plain JSON — readable by
// any script that can touch this origin's storage (a browser extension, a
// devtools paste, an XSS payload, a local backup tool). This module encrypts
// each key with AES-GCM (via the utilities already used for this in
// src/ondeck/lib/crypto.ts) before it ever reaches localStorage.
//
// Honest limitation: the AES key itself is a per-installation symmetric key
// that also lives in localStorage (see getVaultKey below), because this is a
// client-only app with no server to hold a secret out of the page's reach.
// That means a determined attacker who can already execute arbitrary script
// on this page (the XSS case) can read the vault key the same way they'd
// read anything else in localStorage, and fully decrypt every stored key.
// What this DOES defend against is anyone/anything that can read localStorage
// without running script in this page's context — a casual look at the
// storage tab in devtools, a browser extension that only scrapes storage, a
// file/backup sync tool, someone glancing at exported browser data — the
// same "not sitting in cleartext" bar the task asked for, not an unbreakable
// vault.
import { encryptText, decryptText, generateAesKey } from '../../ondeck/lib/crypto';

export interface ApiKeyRecord {
  key: string;
  updatedAt: string;
}

export type ApiKeyStore<P extends string = string> = Partial<Record<P, ApiKeyRecord>>;

interface EncryptedApiKeyRecord {
  ciphertext: string;
  iv: string;
  updatedAt: string;
}

const STORAGE_KEY = '01deck:api-keys';
const VAULT_KEY_STORAGE = '01deck:vault-key';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

let vaultKeyPromise: Promise<CryptoKey> | null = null;

/** The per-installation AES-GCM key used to encrypt stored API keys — generated once, exported to raw bytes, and persisted so it can be re-imported on later loads. See the module header for what this does and doesn't defend against. */
function getVaultKey(): Promise<CryptoKey> {
  if (vaultKeyPromise) return vaultKeyPromise;

  vaultKeyPromise = (async () => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(VAULT_KEY_STORAGE) : null;
    if (stored) {
      try {
        const raw = base64ToBytes(stored);
        return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
      } catch {
        // Fall through and mint a fresh key if the stored one is corrupt.
      }
    }

    const key = await generateAesKey();
    const raw = await crypto.subtle.exportKey('raw', key);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VAULT_KEY_STORAGE, bytesToBase64(new Uint8Array(raw)));
    }
    return key;
  })();

  return vaultKeyPromise;
}

let cache: ApiKeyStore = {};
let loadPromise: Promise<void> | null = null;

async function loadAndDecrypt(): Promise<ApiKeyStore> {
  if (typeof window === 'undefined') return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== 'object') return {};

  const vaultKey = await getVaultKey();
  const result: ApiKeyStore = {};
  let needsRewrite = false;

  for (const providerId of Object.keys(parsed)) {
    const record = parsed[providerId] as Partial<EncryptedApiKeyRecord & ApiKeyRecord> | undefined;
    if (!record) continue;

    if (typeof record.key === 'string') {
      // Legacy plaintext record from before encryption-at-rest — use it,
      // then re-encrypt on write below (lazy migration, same pattern as the
      // password-hash migration in AuthContext).
      result[providerId] = { key: record.key, updatedAt: record.updatedAt ?? new Date().toISOString() };
      needsRewrite = true;
      continue;
    }

    if (typeof record.ciphertext === 'string' && typeof record.iv === 'string') {
      try {
        const plaintext = await decryptText(vaultKey, record.ciphertext, record.iv);
        result[providerId] = { key: plaintext, updatedAt: record.updatedAt ?? new Date().toISOString() };
      } catch {
        // Corrupt or undecryptable (e.g. vault key was reset) — drop rather
        // than surface garbage as a usable key.
      }
    }
  }

  if (needsRewrite) {
    void persist(result);
  }

  return result;
}

async function persist(store: ApiKeyStore): Promise<void> {
  if (typeof window === 'undefined') return;
  const vaultKey = await getVaultKey();
  const encrypted: Record<string, EncryptedApiKeyRecord> = {};

  for (const providerId of Object.keys(store)) {
    const record = store[providerId];
    if (!record || !record.key) continue;
    const { ciphertext, iv } = await encryptText(vaultKey, record.key);
    encrypted[providerId] = { ciphertext, iv, updatedAt: record.updatedAt };
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
  cache = store;
}

/** Kick off (or await) the initial decrypt from localStorage into the in-memory cache. Safe to call repeatedly — it only loads once. */
export function ensureApiKeysLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = loadAndDecrypt().then(store => {
      cache = store;
    });
  }
  return loadPromise;
}

// Kick off loading immediately at module init (browser only) so the
// in-memory cache is warm well before any UI needs it synchronously —
// decrypting a handful of short strings takes low-single-digit
// milliseconds, so in practice this finishes long before a user has typed
// anything. getStoredApiKeysSync() below is a snapshot of whatever the cache
// holds at call time; ensureApiKeysLoaded()/getStoredApiKeysAsync() are the
// way to actually wait for it.
if (typeof window !== 'undefined') {
  void ensureApiKeysLoaded();
}

/** Synchronous snapshot of the decrypted key cache. May be empty on the very first tick after page load, before ensureApiKeysLoaded() resolves — see module header. */
export function getStoredApiKeysSync<P extends string = string>(): ApiKeyStore<P> {
  return cache as ApiKeyStore<P>;
}

export async function getStoredApiKeysAsync<P extends string = string>(): Promise<ApiKeyStore<P>> {
  await ensureApiKeysLoaded();
  return cache as ApiKeyStore<P>;
}

export async function setApiKey<P extends string>(providerId: P, keyValue: string): Promise<ApiKeyStore<P>> {
  await ensureApiKeysLoaded();
  const next: ApiKeyStore = { ...cache, [providerId]: { key: keyValue, updatedAt: new Date().toISOString() } };
  await persist(next);
  return next as ApiKeyStore<P>;
}

export async function removeApiKey<P extends string>(providerId: P): Promise<ApiKeyStore<P>> {
  await ensureApiKeysLoaded();
  const next = { ...cache };
  delete next[providerId];
  await persist(next);
  return next as ApiKeyStore<P>;
}
