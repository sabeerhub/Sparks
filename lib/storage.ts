/**
 * lib/storage.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Persistent local cache, backed by IndexedDB, with an in-memory layer on
 * top for synchronous reads inside render. This is what gives Sparks
 * WhatsApp-like behavior: chat history survives a hard refresh or closing
 * the tab, new messages render instantly (optimistic), and anything sent
 * while offline queues up and flushes automatically on reconnect.
 *
 * Security note: this file NEVER stores key material. Only `iv` +
 * `ciphertext` are persisted for not-yet-decrypted rows that haven't been
 * rendered yet; what's normally cached here is the already-decrypted
 * `DecryptedMessage.text`, which is exactly as sensitive as it would be in
 * any local chat app's on-disk cache (WhatsApp, Signal Desktop, etc. all
 * keep decrypted history at rest on-device — that's the accepted trust
 * boundary: protect the device, not just the wire). The user's private key
 * and derived shared AES keys live only in lib/encryption.ts's in-memory
 * KeyManager and are re-derived after each reload — they are never written
 * here, regardless of this module's persistence.
 */

import type { DecryptedMessage, QueuedMessage, CachedChatMeta } from "@/types";

const DB_NAME = "sparks-cache";
const DB_VERSION = 1;

const STORES = {
  messages: "messages",       // keyed by message id, indexed by chat_id
  chatList: "chat_list",      // single row, key "chats"
  outbox: "outbox",           // queued/failed sends, keyed by client_id
  meta: "chat_meta",          // last-synced timestamps per chat
} as const;

// ─── IndexedDB bootstrap ───────────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable in this environment"));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORES.messages)) {
        const store = db.createObjectStore(STORES.messages, { keyPath: "id" });
        store.createIndex("by_chat", "chat_id", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.chatList)) {
        db.createObjectStore(STORES.chatList, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORES.outbox)) {
        db.createObjectStore(STORES.outbox, { keyPath: "client_id" });
      }
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: "chat_id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

async function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    const req = fn(store);

    t.onerror = () => reject(t.error);
    if (req) {
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    } else {
      t.oncomplete = () => resolve(undefined as T);
    }
  });
}

async function getAllByIndex<T>(storeName: string, indexName: string, value: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, "readonly");
    const idx = t.objectStore(storeName).index(indexName);
    const req = idx.getAll(value);
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

// ─── In-memory mirror (for synchronous reads in render) ───────────────────
// IndexedDB is async-only; React components want a synchronous snapshot.
// This mirror is hydrated from IndexedDB on first access per chat, then
// kept in sync on every write — same pattern as a normal in-memory cache,
// just backed by durable storage instead of being lost on refresh.

type Listener = () => void;

class ChatCache {
  private messagesByChat = new Map<string, DecryptedMessage[]>();
  private hydratedChats = new Set<string>();
  private chatListCache: unknown[] | null = null;
  private outbox = new Map<string, QueuedMessage>();
  private listeners = new Set<Listener>();
  private hydratedOutbox = false;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // ─── Messages ────────────────────────────────────────────────────────
  /** Synchronous read of whatever's currently in memory (may be empty pre-hydration). */
  getMessages(chatId: string): DecryptedMessage[] {
    return this.messagesByChat.get(chatId) ?? [];
  }

  /** Loads a chat's history from IndexedDB into memory. Call once per chat on open. */
  async hydrateChat(chatId: string): Promise<DecryptedMessage[]> {
    if (this.hydratedChats.has(chatId)) {
      return this.getMessages(chatId);
    }
    const rows = await getAllByIndex<DecryptedMessage>(STORES.messages, "by_chat", chatId);
    rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
    this.messagesByChat.set(chatId, rows);
    this.hydratedChats.add(chatId);
    this.notify();
    return rows;
  }

  async setMessages(chatId: string, messages: DecryptedMessage[]) {
    this.messagesByChat.set(chatId, messages);
    this.hydratedChats.add(chatId);
    this.notify();
    await Promise.all(messages.map((m) => tx(STORES.messages, "readwrite", (s) => s.put(m))));
  }

  async upsertMessage(chatId: string, message: DecryptedMessage) {
    const existing = this.messagesByChat.get(chatId) ?? [];
    const idx = existing.findIndex((m) => m.id === message.id);
    const next = idx >= 0
      ? [...existing.slice(0, idx), message, ...existing.slice(idx + 1)]
      : [...existing, message];
    this.messagesByChat.set(chatId, next);
    this.notify();
    await tx(STORES.messages, "readwrite", (s) => s.put(message));
  }

  /**
   * Optimistic insert: render immediately with status "pending" before the
   * server round-trip resolves. The temp id (client_id) is reconciled with
   * the real server id once send_message() returns.
   */
  async addOptimisticMessage(chatId: string, message: DecryptedMessage) {
    await this.upsertMessage(chatId, message);
  }

  /** Reconcile a temp/optimistic row with the confirmed server row. */
  async resolveMessage(chatId: string, tempId: string, serverMessage: DecryptedMessage) {
    const existing = this.messagesByChat.get(chatId) ?? [];
    const next = existing.map((m) => (m.id === tempId ? serverMessage : m));
    this.messagesByChat.set(chatId, next);
    this.notify();
    await tx(STORES.messages, "readwrite", (s) => s.delete(tempId));
    await tx(STORES.messages, "readwrite", (s) => s.put(serverMessage));
  }

  async markFailed(chatId: string, tempId: string) {
    const existing = this.messagesByChat.get(chatId) ?? [];
    const next = existing.map((m) => (m.id === tempId ? { ...m, status: "failed" as const } : m));
    this.messagesByChat.set(chatId, next);
    this.notify();
    const updated = next.find((m) => m.id === tempId);
    if (updated) await tx(STORES.messages, "readwrite", (s) => s.put(updated));
  }

  async clearChat(chatId: string) {
    this.messagesByChat.delete(chatId);
    this.hydratedChats.delete(chatId);
    this.notify();
    const rows = await getAllByIndex<DecryptedMessage>(STORES.messages, "by_chat", chatId);
    await Promise.all(rows.map((r) => tx(STORES.messages, "readwrite", (s) => s.delete(r.id))));
  }

  // ─── Chat list ───────────────────────────────────────────────────────
  getChatList(): unknown[] | null {
    return this.chatListCache;
  }

  async hydrateChatList(): Promise<unknown[] | null> {
    const row = await tx<{ key: string; value: unknown[] } | undefined>(
      STORES.chatList,
      "readonly",
      (s) => s.get("chats")
    );
    this.chatListCache = row?.value ?? null;
    this.notify();
    return this.chatListCache;
  }

  async setChatList(chats: unknown[]) {
    this.chatListCache = chats;
    this.notify();
    await tx(STORES.chatList, "readwrite", (s) => s.put({ key: "chats", value: chats }));
  }

  // ─── Outbox (offline send queue) ────────────────────────────────────────
  async hydrateOutbox(): Promise<QueuedMessage[]> {
    if (this.hydratedOutbox) return [...this.outbox.values()];
    const all = await tx<QueuedMessage[]>(STORES.outbox, "readonly", (s) => s.getAll());
    all.forEach((m) => this.outbox.set(m.client_id, m));
    this.hydratedOutbox = true;
    this.notify();
    return all;
  }

  async enqueue(message: QueuedMessage) {
    this.outbox.set(message.client_id, message);
    this.notify();
    await tx(STORES.outbox, "readwrite", (s) => s.put(message));
  }

  async dequeue(clientId: string) {
    this.outbox.delete(clientId);
    this.notify();
    await tx(STORES.outbox, "readwrite", (s) => s.delete(clientId));
  }

  getOutbox(chatId?: string): QueuedMessage[] {
    const all = [...this.outbox.values()];
    return chatId ? all.filter((m) => m.chat_id === chatId) : all;
  }

  // ─── Sync metadata ───────────────────────────────────────────────────
  async getLastSynced(chatId: string): Promise<string | null> {
    const row = await tx<CachedChatMeta | undefined>(STORES.meta, "readonly", (s) => s.get(chatId));
    return row?.last_synced_at ?? null;
  }

  async setLastSynced(chatId: string, isoTime: string) {
    await tx(STORES.meta, "readwrite", (s) => s.put({ chat_id: chatId, last_synced_at: isoTime }));
  }

  // ─── Full wipe (logout) ──────────────────────────────────────────────
  async clearAll() {
    this.messagesByChat.clear();
    this.hydratedChats.clear();
    this.chatListCache = null;
    this.outbox.clear();
    this.hydratedOutbox = false;
    this.notify();
    const db = await openDb();
    await Promise.all(
      Object.values(STORES).map(
        (storeName) =>
          new Promise<void>((resolve, reject) => {
            const t = db.transaction(storeName, "readwrite");
            t.objectStore(storeName).clear();
            t.oncomplete = () => resolve();
            t.onerror = () => reject(t.error);
          })
      )
    );
  }
}

/** Single cache instance for the app's lifetime, backed by durable storage. */
export const chatCache = new ChatCache();

// ─── Sync-on-reconnect ──────────────────────────────────────────────────────

type SendFn = (queued: QueuedMessage) => Promise<DecryptedMessage>;

/**
 * Retries every message still sitting in the outbox for a chat, in send
 * order, stopping at the first failure to preserve ordering (a later
 * message shouldn't be confirmed before an earlier one in the same chat).
 */
export async function flushOutbox(chatId: string, sendFn: SendFn) {
  const pending = chatCache.getOutbox(chatId).filter((m) => m.status !== "sending");

  for (const queued of pending) {
    try {
      await chatCache.enqueue({ ...queued, status: "sending" });
      const serverMessage = await sendFn(queued);
      await chatCache.resolveMessage(chatId, queued.client_id, serverMessage);
      await chatCache.dequeue(queued.client_id);
    } catch {
      await chatCache.enqueue({ ...queued, status: "failed", attempts: queued.attempts + 1 });
      await chatCache.markFailed(chatId, queued.client_id);
      break;
    }
  }
}

/** Wire this up once at app root (see hooks/useChat.ts) to auto-flush on reconnect. */
export function registerReconnectSync(chatId: string, sendFn: SendFn) {
  const handler = () => flushOutbox(chatId, sendFn);
  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}
