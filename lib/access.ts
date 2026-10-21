/**
 * Access gate for POST /api/compare.
 *
 * Provider keys may only be spent for callers that present the shared
 * `COMPARE_ACCESS_TOKEN` as `Authorization: Bearer <token>`. Everyone else
 * gets demo mode, which never calls a provider. A missing or too-short token
 * fails closed: nobody gets live mode until the operator sets a real secret.
 */
import { createHash, timingSafeEqual } from "node:crypto";

export const MIN_TOKEN_CHARS = 24;

export type AccessMode = "live" | "demo";

type Env = Record<string, string | undefined>;

function configuredToken(env: Env): string | null {
  const token = env.COMPARE_ACCESS_TOKEN?.trim() ?? "";
  return token.length >= MIN_TOKEN_CHARS ? token : null;
}

function presentedToken(headers: Headers): string | null {
  const match = /^Bearer\s+(\S+)\s*$/i.exec(headers.get("authorization") ?? "");
  return match ? match[1] : null;
}

/** Compare digests so the check takes the same time whatever the input. */
function sameSecret(a: string, b: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

export function accessMode(headers: Headers, env: Env = process.env): AccessMode {
  const expected = configuredToken(env);
  const presented = presentedToken(headers);
  if (!expected || !presented) return "demo";
  return sameSecret(presented, expected) ? "live" : "demo";
}
