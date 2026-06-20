/**
 * lib/encryption.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Session-scoped key manager. Holds the user's unwrapped private key and
 * derived per-chat shared keys in memory ONLY — deliberately, regardless
 * of how the message cache itself is persisted (see lib/storage.ts, which
 * does use IndexedDB for decrypted message history). Key material is a
 * different trust tier than chat content: it's what an attacker would need
 * to decrypt everything retroactively, so it never touches disk in any
 * form. On reload, the private key is re-derived from its wrapped copy +
 * the user's session, and shared keys are re-derived on demand.
 */

import {
  deriveSharedKey,
  importPrivateKeyJwk,
  importPublicKeyJwk,
} from "./crypto";

class KeyManager {
  private myPrivateKey: CryptoKey | null = null;
  private sharedKeyCache = new Map<string, CryptoKey>(); // chatId -> derived AES key

  /** Call once after login, after unwrapping the stored private key JWK. */
  async setPrivateKey(jwk: JsonWebKey) {
    this.myPrivateKey = await importPrivateKeyJwk(jwk);
    this.sharedKeyCache.clear(); // invalidate — keys must be re-derived for the new session
  }

  hasPrivateKey(): boolean {
    return this.myPrivateKey !== null;
  }

  /** Clears all key material from memory. Call on logout. */
  clear() {
    this.myPrivateKey = null;
    this.sharedKeyCache.clear();
  }

  /**
   * Returns the AES-256-GCM key shared with the other member of a chat,
   * deriving and caching it on first use per chat per session.
   */
  async getSharedKey(chatId: string, theirPublicKeyJwk: JsonWebKey): Promise<CryptoKey> {
    if (!this.myPrivateKey) {
      throw new Error("No private key loaded — user must be logged in");
    }

    const cached = this.sharedKeyCache.get(chatId);
    if (cached) return cached;

    const theirPublicKey = await importPublicKeyJwk(theirPublicKeyJwk);
    const sharedKey = await deriveSharedKey(this.myPrivateKey, theirPublicKey);

    this.sharedKeyCache.set(chatId, sharedKey);
    return sharedKey;
  }
}

/**
 * Single instance for the life of the tab. Deliberately not persisted
 * anywhere — a hard refresh means re-deriving from the wrapped private key,
 * which is the intended in-memory-only tradeoff for this MVP.
 */
export const keyManager = new KeyManager();
