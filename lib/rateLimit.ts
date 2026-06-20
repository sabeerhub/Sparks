/**
 * lib/rateLimit.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Client-side throttle. This exists purely for UX — to stop a user's own
 * UI from hammering Supabase and to show an immediate "slow down" message
 * without a round trip. It is NOT the security boundary: a malicious client
 * could skip this file entirely, which is why public.send_message() in
 * 0003_functions.sql re-checks the same limit server-side via
 * can_send_message() inside the same transaction as the insert. Treat this
 * file as a courtesy, and the SQL function as the actual enforcement.
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 25, // keep in sync with can_send_message()'s default p_limit
  windowMs: 60_000,
};

class SlidingWindowRateLimiter {
  private timestamps: number[] = [];

  constructor(private config: RateLimitConfig = DEFAULT_CONFIG) {}

  /** Returns true if a new action is allowed right now. */
  tryAcquire(): boolean {
    const now = Date.now();
    this.evictExpired(now);

    if (this.timestamps.length >= this.config.maxRequests) {
      return false;
    }

    this.timestamps.push(now);
    return true;
  }

  /** Milliseconds until the next slot frees up, or 0 if available now. */
msUntilNextSlot(): number {
    const now = Date.now();
    this.evictExpired(now);

    if (this.timestamps.length < this.config.maxRequests) return 0;

    const oldest = this.timestamps[0];
    if (oldest === undefined) return 0;
    return Math.max(0, this.config.windowMs - (now - oldest));
  }

  private evictExpired(now: number) {
    const cutoff = now - this.config.windowMs;
    while (this.timestamps.length > 0 && (this.timestamps[0] as number) < cutoff) {
      this.timestamps.shift();
    }
  }
}

/** One limiter per chat, so a burst in one conversation doesn't block others. */
const limiters = new Map<string, SlidingWindowRateLimiter>();

export function canSendMessage(chatId: string): boolean {
  if (!limiters.has(chatId)) {
    limiters.set(chatId, new SlidingWindowRateLimiter());
  }
  return limiters.get(chatId)!.tryAcquire();
}

export function msUntilNextMessageSlot(chatId: string): number {
  return limiters.get(chatId)?.msUntilNextSlot() ?? 0;
}

export class RateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super(`Rate limit exceeded. Try again in ${Math.ceil(retryAfterMs / 1000)}s.`);
    this.name = "RateLimitError";
  }
}
