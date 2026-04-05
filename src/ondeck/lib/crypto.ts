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

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Identity is signed from only the stable state fields so the signature can be
// re-verified after import without depending on runtime-only data.
export async function computeStateHash(input: {
  system_prompt: string;
  model: string;
  temperature: number;
}): Promise<string> {
  const payload = JSON.stringify({
    system_prompt: input.system_prompt,
    model: input.model,
    temperature: input.temperature,
  });
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(payload));
  return bytesToHex(new Uint8Array(digest));
}

export async function generateAgentIdentity(input: {
  system_prompt: string;
  model: string;
  temperature: number;
}): Promise<{
  public_key: string;
  private_key: CryptoKey;
  state_hash: string;
  signature: string;
}> {
  const state_hash = await computeStateHash(input);
  const keyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' } as AlgorithmIdentifier,
    true,
    ['sign', 'verify'],
  );
  const signatureBuffer = await crypto.subtle.sign(
    { name: 'Ed25519' } as AlgorithmIdentifier,
    keyPair.privateKey,
    encoder.encode(state_hash),
  );
  const rawPublicKey = await crypto.subtle.exportKey('raw', keyPair.publicKey);

  return {
    public_key: bytesToBase64(new Uint8Array(rawPublicKey)),
    private_key: keyPair.privateKey,
    state_hash,
    signature: bytesToBase64(new Uint8Array(signatureBuffer)),
  };
}

export async function verifyAgentSignature(input: {
  public_key: string;
  signature: string;
  system_prompt: string;
  model: string;
  temperature: number;
  state_hash: string;
}): Promise<boolean> {
  const derivedHash = await computeStateHash(input);
  if (derivedHash !== input.state_hash) return false;

  const publicKey = await crypto.subtle.importKey(
    'raw',
    base64ToBytes(input.public_key),
    { name: 'Ed25519' } as AlgorithmIdentifier,
    true,
    ['verify'],
  );

  return crypto.subtle.verify(
    { name: 'Ed25519' } as AlgorithmIdentifier,
    publicKey,
    base64ToBytes(input.signature),
    encoder.encode(input.state_hash),
  );
}

export async function signPayload(privateKey: CryptoKey, payload: string): Promise<string> {
  const signature = await crypto.subtle.sign(
    { name: 'Ed25519' } as AlgorithmIdentifier,
    privateKey,
    encoder.encode(payload),
  );
  return bytesToBase64(new Uint8Array(signature));
}

export async function verifyPayload(
  publicKeyBase64: string,
  payload: string,
  signatureBase64: string,
): Promise<boolean> {
  const publicKey = await crypto.subtle.importKey(
    'raw',
    base64ToBytes(publicKeyBase64),
    { name: 'Ed25519' } as AlgorithmIdentifier,
    true,
    ['verify'],
  );

  return crypto.subtle.verify(
    { name: 'Ed25519' } as AlgorithmIdentifier,
    publicKey,
    base64ToBytes(signatureBase64),
    encoder.encode(payload),
  );
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
