# Upgrade plan

## Current state: 8/10 (was 7/10)

Compare flow works when keys are set and is now bounded against cost abuse;
validated, tested, and covered by CI.

## Backlog

### P0
- Set `OPENAI_MODEL_ID` / `ANTHROPIC_MODEL_ID` / `GOOGLE_MODEL_ID` in Vercel
  (required since pass 2 — lanes without one stay disabled).

### P1
- Durable rate limiting (Vercel KV / Upstash) instead of per-instance memory.
- Stream responses per lane (`streamText`) so slow models do not block others.
- Confirm canonical domain; set `NEXT_PUBLIC_SITE_URL`.

### P2
- Copy-to-clipboard per lane and token/latency summary row.
- Remove the `dangerouslySetInnerHTML` design-contract comment span.

## Done in this pass
- `lib/compare.ts`: request validation (prompt length, known/deduped model
  ids), rate limiter, error truncation; route adds output-token cap, timeout,
  retry cap, JSON parse guard. Unit-tested.
- Per-provider model id overrides via env (`lib/models.ts`), tested.
- Replaced stub `/api/mcp` with read-only `list_models`.
- CI (lint, typecheck, test, build); fixed lint errors; replaced
  create-next-app README; OG/Twitter metadata; robots/sitemap in-app.
- a11y: prompt counter linked to textarea, live status for comparisons.

## Done in this pass (pass 2)
- Model ids are config-driven: removed the hard-coded (partly retired) defaults
  `claude-3-5-haiku-latest` / `gemini-1.5-flash` / `gpt-4o-mini`. Each lane needs
  `*_MODEL_ID` + key; unset, malformed, or known-retired ids yield a
  `missing-model` / `invalid-model` status with an operator-readable reason
  (shown in the UI, `GET /api/compare`, MCP `list_models`) and the lane is
  never called. Lanes are keyed by provider, so a model swap does not change
  the API. Tests are offline (`tests/compare.test.ts`).
- a11y: keyboard focus ring on the (visually hidden) channel checkboxes; lane
  problems linked via `aria-describedby`.

