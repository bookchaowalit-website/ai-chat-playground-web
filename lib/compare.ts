/** Request validation and abuse limits for POST /api/compare. */

export const MAX_PROMPT_CHARS = 4000;
export const MAX_OUTPUT_TOKENS = 600;
export const REQUEST_TIMEOUT_MS = 30_000;
export const MAX_ERROR_CHARS = 300;

export type CompareRequest = { prompt: string; modelIds: string[] };

export type ValidationResult = { ok: true; value: CompareRequest } | { ok: false; error: string };

export function validateCompareRequest(body: unknown, knownIds: readonly string[]): ValidationResult {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Body must be a JSON object." };
  const { prompt, modelIds } = body as { prompt?: unknown; modelIds?: unknown };
  if (typeof prompt !== "string" || !prompt.trim()) return { ok: false, error: "prompt is required" };
  if (prompt.length > MAX_PROMPT_CHARS) {
    return { ok: false, error: `prompt must be at most ${MAX_PROMPT_CHARS} characters` };
  }
  if (!Array.isArray(modelIds) || modelIds.some((id) => typeof id !== "string")) {
    return { ok: false, error: "modelIds must be an array of strings" };
  }
  const unique = [...new Set(modelIds as string[])].filter((id) => knownIds.includes(id));
  if (unique.length === 0) return { ok: false, error: "select at least one known model" };
  return { ok: true, value: { prompt: prompt.trim(), modelIds: unique } };
}

/** Keep provider error text short so upstream payloads are not echoed wholesale. */
export function summarizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Request failed";
  return message.length > MAX_ERROR_CHARS ? `${message.slice(0, MAX_ERROR_CHARS)}…` : message;
}

/**
 * Fixed-window rate limiter kept in memory. On serverless platforms this is
 * per-instance and best-effort; it still stops a single client hammering one
 * warm instance and spending provider credit.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return function allow(key: string, now = Date.now()): boolean {
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (hits.size > 5000) hits.clear();
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
}

export function clientKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "anonymous";
}
