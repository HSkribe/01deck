// Agent identity (keypairs, signing, verification) lives entirely in
// ./protocol.ts now, backed by the vendored @01protocol/sdk — see that
// file's header comment for why. This module only handles the pieces that
// were never identity: hashing persistent-memory entries for the tamper
// chain, and AES-GCM encryption of messages/memory at rest.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256Hex(payload: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(payload));
  return bytesToHex(new Uint8Array(digest));
}

export async function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function deriveAesKeyFromPassphrase(passphrase: string, salt?: string): Promise<{
  key: CryptoKey;
  salt: string;
}> {
  const saltBytes = salt ? base64ToBytes(salt) : crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 120000,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );

  return {
    key,
    salt: bytesToBase64(saltBytes),
  };
}

export async function encryptText(key: CryptoKey, plaintext: string): Promise<{
  ciphertext: string;
  iv: string;
}> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext),
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
  };
}

export async function decryptText(key: CryptoKey, ciphertext: string, iv: string): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext),
  );

  return decoder.decode(plaintext);
}
