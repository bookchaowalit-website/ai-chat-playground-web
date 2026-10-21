# Upgrade plan

## Current state: 8/10 (was 7/10)

Compare flow works when keys are set and is now bounded against cost abuse;
validated, tested, and covered by CI.

## Backlog

### P0
- Live lanes need `COMPARE_ACCESS_TOKEN` (≥ 24 chars) in Vercel; without it the
  bench stays in demo mode for everyone (access gate added 2026-10-21).
- Set `OPENAI_MODEL_ID` / `ANTHROPIC_MODEL_ID` / `GOOGLE_MODEL_ID` in Vercel
  (required since pass 2 — lanes without one stay disabled).

### P1
- Provision Upstash / Vercel KV in production (env vars in README) so the
  per-client limit and daily cap are shared across instances; set
  `COMPARE_DAILY_REQUEST_CAP` to the intended budget.
- Stream responses per lane (`streamText`) so slow models do not block others.
- Confirm canonical domain; set `NEXT_PUBLIC_SITE_URL`.

### P2
- Copy-to-clipboard per lane and token/latency summary row.
- Remove the `dangerouslySetInnerHTML` design-contract comment span.

## Done in this pass (pass 4)
- `lib/rateLimit.ts`: `CounterStore` abstraction with an in-memory default and
  an Upstash REST store (also Vercel KV env names; plain `fetch`, no new
  dependency). `POST /api/compare` checks a per-client window (10/min) and a
  deployment-wide daily cap (`COMPARE_DAILY_REQUEST_CAP`, default 500/UTC day)
  after validation and before any provider call. Fails closed (503) on a
  misconfigured cap or store error; 429 + `Retry-After` when exceeded.
  Per-client rejections do not consume the daily budget.
- Removed the old per-instance `createRateLimiter`. `tests/rateLimit.test.ts`
  covers windows, daily cap/rollover, fail-closed paths, env selection and the
  Upstash request shape with a fake `fetch`. Verified: 32 tests, lint,
  typecheck, `next build`.

## Done in pass 1
- `lib/compare.ts`: request validation (prompt length, known/deduped model
  ids), rate limiter, error truncation; route adds output-token cap, timeout,
  retry cap, JSON parse guard. Unit-tested.
- Per-provider model id overrides via env (`lib/models.ts`), tested.
- Replaced stub `/api/mcp` with read-only `list_models`.
- CI (lint, typecheck, test, build); fixed lint errors; replaced
  create-next-app README; OG/Twitter metadata; robots/sitemap in-app.
- a11y: prompt counter linked to textarea, live status for comparisons.

## Done in pass 2
- Model ids are config-driven: removed the hard-coded (partly retired) defaults
  `claude-3-5-haiku-latest` / `gemini-1.5-flash` / `gpt-4o-mini`. Each lane needs
  `*_MODEL_ID` + key; unset, malformed, or known-retired ids yield a
  `missing-model` / `invalid-model` status with an operator-readable reason
  (shown in the UI, `GET /api/compare`, MCP `list_models`) and the lane is
  never called. Lanes are keyed by provider, so a model swap does not change
  the API. Tests are offline (`tests/compare.test.ts`).
- a11y: keyboard focus ring on the (visually hidden) channel checkboxes; lane
  problems linked via `aria-describedby`.
- `/more-projects` no longer links to this app itself.

## Done in pass 3
- Edge-case pass on `lib/compare.ts` (regression tests in `tests/compare.test.ts`):
  - A prompt of only zero-width characters / BOM passed `trim()` checks on the
    page and the API and was sent to every provider (spending credit on an
    empty question). `hasVisibleText` now guards both.
  - The length limit was checked on the untrimmed prompt but the trimmed one
    was sent, so trailing newlines could reject a valid prompt.
  - `summarizeError` could cut an emoji in half at the 300-unit limit, leaving
    a lone surrogate in the JSON error.
- Security deps: `next` 16.1.6 -> 16.3.8 (and `eslint-config-next`) clears critical GHSA-2xp9-vwfh-vxw4 (Image Optimization RCE) plus bundled postcss/sharp highs; lockfile regenerated with same-major `npm audit fix`. `npm audit --omit=dev`: C1/H4/M1/L0 [nanoid:h,next:c,postcss:h,sharp:h,undici:h] -> C0/H0/M0/L0.
