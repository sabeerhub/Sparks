/**
 * lib/crypto.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Web Crypto helpers (ECDH key pairs, AES-256-GCM encrypt/decrypt).
 * Nothing in this file ever touches the network — it is pure Web Crypto
 * API usage.
 *
 * HONEST V1 STATUS: only generateKeyPair + exportPublicKeyJwk are used,
 * at signup, to store a public key in profiles.public_key (the column is
 * NOT NULL in the schema, and the key is reserved for a future E2E
 * version). No private key is generated, stored, or used in V1, and
 * messages are NOT end-to-end encrypted in V1 — they are plain text,
 * protected by Supabase Auth + RLS + HTTPS + encryption at rest (see
 * services/message-service.ts). deriveSharedKey / encrypt / decrypt below
 * are kept for that future E2E version and are currently unused — do not
 * describe them as live. True E2E with a proper recovery-key flow is
 * planned for a future version (V4/V5).
 */

const ECDH_PARAMS: EcKeyGenParams = { name: "ECDH", namedCurve: "P-256" };
const AES_PARAMS = { name: "AES-GCM", length: 256 };

// ─── Key generation ───────────────────────────────────────────────────────

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(ECDH_PARAMS, true /* extractable */, [
    "deriveKey",
  ]);
}

export async function exportPublicKeyJwk(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", key);
}

export async function importPublicKeyJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", jwk, ECDH_PARAMS, true, []);
}

/**
 * Private keys are exportable only so they can be wrapped and held in
 * memory for the session (per the no-IndexedDB decision). They are never
 * written anywhere persistent in plaintext form.
 */
export async function exportPrivateKeyJwk(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", key);
}

export async function importPrivateKeyJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", jwk, ECDH_PARAMS, true, ["deriveKey"]);
}

// ─── Shared key derivation ───────────────────────────────────────────────

/**
 * Derives the AES-256-GCM key shared between two parties for a given chat.
 * Both sides compute the same key independently — it is never transmitted.
 */
export async function deriveSharedKey(
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: theirPublicKey },
    myPrivateKey,
    AES_PARAMS,
    false /* not extractable — key only usable in-memory via subtle.encrypt/decrypt */,
    ["encrypt", "decrypt"]
  );
}

// ─── Message encryption ──────────────────────────────────────────────────

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
}

export async function encryptMessage(
  plaintext: string,
  sharedKey: CryptoKey
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit nonce, GCM standard
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    encoded
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv.buffer),
  };
}

export async function decryptMessage(
  payload: EncryptedPayload,
  sharedKey: CryptoKey
): Promise<string> {
  const ciphertextBuffer = base64ToBuffer(payload.ciphertext);
  const iv = base64ToBuffer(payload.iv);

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    ciphertextBuffer
  );

  return new TextDecoder().decode(plaintextBuffer);
}

// ─── Media encryption (images/files/voice notes) ───────────────────────────
// Same AES-GCM key and approach, applied to raw bytes instead of text, so
// uploaded blobs in Supabase Storage are ciphertext too.

export async function encryptBlob(
  data: ArrayBuffer,
  sharedKey: CryptoKey
): Promise<{ encrypted: ArrayBuffer; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    data
  );
  return { encrypted, iv: bufferToBase64(iv.buffer) };
}

export async function decryptBlob(
  encrypted: ArrayBuffer,
  ivBase64: string,
  sharedKey: CryptoKey
): Promise<ArrayBuffer> {
  const iv = base64ToBuffer(ivBase64);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, sharedKey, encrypted);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
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
