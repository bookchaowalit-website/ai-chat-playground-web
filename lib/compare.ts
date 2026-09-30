/** Request validation and abuse limits for POST /api/compare. */

export const MAX_PROMPT_CHARS = 4000;
export const MAX_OUTPUT_TOKENS = 600;
export const REQUEST_TIMEOUT_MS = 30_000;
export const MAX_ERROR_CHARS = 300;

/**
 * True when the text has something other than whitespace or invisible
 * characters (zero-width space/joiners, word joiner, BOM, soft hyphen), which
 * `String.prototype.trim` keeps. An invisible-only prompt would otherwise be
 * sent to every provider and spend credit on an empty question.
 */
export function hasVisibleText(text: string): boolean {
  return text.replace(/[\s\u200B-\u200D\u2060\uFEFF\u00AD]/g, "") !== "";
}

export type CompareRequest = { prompt: string; modelIds: string[] };

export type ValidationResult = { ok: true; value: CompareRequest } | { ok: false; error: string };

export function validateCompareRequest(body: unknown, knownIds: readonly string[]): ValidationResult {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Body must be a JSON object." };
  const { prompt, modelIds } = body as { prompt?: unknown; modelIds?: unknown };
  if (typeof prompt !== "string" || !hasVisibleText(prompt)) return { ok: false, error: "prompt is required" };
  const trimmed = prompt.trim();
  if (trimmed.length > MAX_PROMPT_CHARS) {
    return { ok: false, error: `prompt must be at most ${MAX_PROMPT_CHARS} characters` };
  }
  if (!Array.isArray(modelIds) || modelIds.some((id) => typeof id !== "string")) {
    return { ok: false, error: "modelIds must be an array of strings" };
  }
  const unique = [...new Set(modelIds as string[])].filter((id) => knownIds.includes(id));
  if (unique.length === 0) return { ok: false, error: "select at least one known model" };
  return { ok: true, value: { prompt: trimmed, modelIds: unique } };
}

/** Keep provider error text short so upstream payloads are not echoed wholesale. */
export function summarizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Request failed";
  if (message.length <= MAX_ERROR_CHARS) return message;
  // Do not cut between the two halves of a surrogate pair (emoji etc.).
  const end = /[\uD800-\uDBFF]/.test(message[MAX_ERROR_CHARS - 1]) ? MAX_ERROR_CHARS - 1 : MAX_ERROR_CHARS;
  return `${message.slice(0, end)}…`;
}

export function clientKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "anonymous";
}
