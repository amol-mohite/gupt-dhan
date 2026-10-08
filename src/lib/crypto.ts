/**
 * Client-side encryption for sensitive field values.
 * Uses AES-GCM with a PBKDF2-derived key from the user's password + salt.
 * The key is held in memory only — never persisted to localStorage or the DB.
 */

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return bufferToBase64(salt.buffer);
}

async function deriveKey(password: string, saltBase64: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(base64ToBuffer(saltBase64)),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptValue(
  plaintext: string,
  key: CryptoKey
): Promise<string> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return `enc:${bufferToBase64(combined.buffer)}`;
}

export async function decryptValue(
  encrypted: string,
  key: CryptoKey
): Promise<string> {
  if (!encrypted.startsWith('enc:')) return encrypted;
  const combined = new Uint8Array(base64ToBuffer(encrypted.slice(4)));
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  const dec = new TextDecoder();
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return dec.decode(plaintext);
}

export function isEncrypted(value: string | null | undefined): boolean {
  return !!value && value.startsWith('enc:');
}

let cachedKey: CryptoKey | null = null;

export async function initEncryptionKey(
  password: string,
  saltBase64: string
): Promise<CryptoKey> {
  cachedKey = await deriveKey(password, saltBase64);
  return cachedKey;
}

export function getEncryptionKey(): CryptoKey | null {
  return cachedKey;
}

export function clearEncryptionKey(): void {
  cachedKey = null;
}

export function generateNewSalt(): string {
  return generateSalt();
}

/** Simple hash for PIN verification (not for crypto — just for comparison) */
export async function hashPin(pin: string, saltBase64: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(base64ToBuffer(saltBase64)),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return bufferToBase64(bits);
}

export async function verifyPin(
  pin: string,
  storedHash: string,
  saltBase64: string
): Promise<boolean> {
  const hash = await hashPin(pin, saltBase64);
  return hash === storedHash;
}
