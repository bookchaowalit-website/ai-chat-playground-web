/**
 * Rate limiting and daily spend cap for POST /api/compare.
 *
 * Counters live behind a small `CounterStore` interface:
 * - `MemoryCounterStore` (default): per server instance, best-effort.
 * - `UpstashCounterStore`: durable and shared across instances, used when
 *   `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (or Vercel KV's
 *   `KV_REST_API_URL` + `KV_REST_API_TOKEN`) are set. Talks to the Upstash
 *   REST API with `fetch`, so no extra dependency.
 *
 * The daily cap (`COMPARE_DAILY_REQUEST_CAP`, default 500 per UTC day) bounds
 * provider spend for the whole deployment. It fails closed: when the cap is
 * reached, the value is misconfigured, or the counter store is unreachable,
 * no provider is called.
 */

export interface WindowCount {
  count: number;
  /** Epoch ms when this window resets. */
  resetAt: number;
}

export interface CounterStore {
  readonly kind: "memory" | "upstash";
  /** Increment `key` in the fixed window of `windowMs` containing `now`. */
  increment(key: string, windowMs: number, now: number): Promise<WindowCount>;
}

function windowBounds(windowMs: number, now: number) {
  const index = Math.floor(now / windowMs);
  return { index, resetAt: (index + 1) * windowMs };
}

export class MemoryCounterStore implements CounterStore {
  readonly kind = "memory" as const;
  private readonly counts = new Map<string, WindowCount>();
  private readonly maxKeys: number;

  constructor(maxKeys = 5000) {
    this.maxKeys = maxKeys;
  }

  async increment(key: string, windowMs: number, now: number): Promise<WindowCount> {
    const { index, resetAt } = windowBounds(windowMs, now);
    const slot = `${key}:${index}`;
    const entry = this.counts.get(slot);
    if (entry) {
      entry.count += 1;
      return { ...entry };
    }
    if (this.counts.size >= this.maxKeys) {
      for (const [k, v] of this.counts) if (v.resetAt <= now) this.counts.delete(k);
      if (this.counts.size >= this.maxKeys) this.counts.clear();
    }
    const fresh = { count: 1, resetAt };
    this.counts.set(slot, fresh);
    return { ...fresh };
  }
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export class UpstashCounterStore implements CounterStore {
  readonly kind = "upstash" as const;
  private readonly url: string;
  private readonly token: string;
  private readonly prefix: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: { url: string; token: string; prefix?: string; fetch?: FetchLike }) {
    this.url = options.url.replace(/\/+$/, "");
    this.token = options.token;
    this.prefix = options.prefix ?? "model-bench";
    this.fetchImpl = options.fetch ?? ((input, init) => fetch(input, init));
  }

  async increment(key: string, windowMs: number, now: number): Promise<WindowCount> {
    const { index, resetAt } = windowBounds(windowMs, now);
    const slot = `${this.prefix}:${key}:${index}`;
    const response = await this.fetchImpl(`${this.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      // Keep the key a little past the window so late increments still expire.
      body: JSON.stringify([
        ["INCR", slot],
        ["PEXPIRE", slot, String(windowMs * 2)],
      ]),
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Rate-limit store returned HTTP ${response.status}`);
    const payload: unknown = await response.json();
    const first = Array.isArray(payload) ? (payload[0] as { result?: unknown; error?: unknown }) : undefined;
    if (!first || first.error !== undefined || typeof first.result !== "number") {
      throw new Error("Rate-limit store returned an unexpected response");
    }
    return { count: first.result, resetAt };
  }
}

type Env = Record<string, string | undefined>;

export function createCounterStore(env: Env = process.env): CounterStore {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (url && token) return new UpstashCounterStore({ url, token });
  return new MemoryCounterStore();
}

export const DEFAULT_DAILY_CAP = 500;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Positive integer from env, the default when unset, or `null` when invalid. */
export function parseDailyCap(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return DEFAULT_DAILY_CAP;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export interface LimitPolicy {
  perClient: { limit: number; windowMs: number };
  /** Requests per UTC day for the whole deployment; `null` = misconfigured. */
  dailyCap: number | null;
}

export type LimitDecision =
  | { ok: true }
  | { ok: false; status: 429 | 503; error: string; retryAfterSeconds?: number };

function secondsUntil(resetAt: number, now: number) {
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
}

export async function checkCompareLimits(
  store: CounterStore,
  client: string,
  policy: LimitPolicy,
  now = Date.now()
): Promise<LimitDecision> {
  if (policy.dailyCap === null) {
    return { ok: false, status: 503, error: "Comparisons are paused: the daily request cap is misconfigured." };
  }
  try {
    const perClient = await store.increment(`client:${client}`, policy.perClient.windowMs, now);
    if (perClient.count > policy.perClient.limit) {
      return {
        ok: false,
        status: 429,
        error: "Too many comparisons. Wait a minute and try again.",
        retryAfterSeconds: secondsUntil(perClient.resetAt, now),
      };
    }
    const daily = await store.increment("daily", DAY_MS, now);
    if (daily.count > policy.dailyCap) {
      return {
        ok: false,
        status: 429,
        error: "The daily comparison budget is used up. Try again tomorrow (UTC).",
        retryAfterSeconds: secondsUntil(daily.resetAt, now),
      };
    }
    return { ok: true };
  } catch {
    // Fail closed: without a working counter we cannot bound provider spend.
    return { ok: false, status: 503, error: "Comparisons are temporarily unavailable. Try again shortly." };
  }
}
